import * as vscode from 'vscode';
import axios from 'axios';

interface SentryError {
  id: string;
  title: string;
  count: number;
  lastSeen: string;
  culprit?: string;
  metadata?: {
    filename?: string;
    function?: string;
  };
}

interface SentryConfig {
  authToken: string;
  organization: string;
  project: string;
  enabled: boolean;
}

class SentryErrorProvider {
  private decorationType: vscode.TextEditorDecorationType;
  private errors: Map<string, SentryError[]> = new Map();
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1em',
        color: new vscode.ThemeColor('editorWarning.foreground'),
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'sentry-plugin.refreshErrors';
    this.updateStatusBar('Ready');
    this.statusBarItem.show();
  }

  private getConfiguration(): SentryConfig {
    const config = vscode.workspace.getConfiguration('sentryPlugin');
    return {
      authToken: config.get('authToken', ''),
      organization: config.get('organization', ''),
      project: config.get('project', ''),
      enabled: config.get('enabled', true),
    };
  }

  private async fetchSentryErrors(): Promise<SentryError[]> {
    const config = this.getConfiguration();
    
    if (!config.enabled || !config.authToken || !config.organization || !config.project) {
      return [];
    }

    try {
      const response = await axios.get(
        `https://sentry.io/api/0/projects/${config.organization}/${config.project}/issues/`,
        {
          headers: {
            'Authorization': `Bearer ${config.authToken}`,
          },
          params: {
            statsPeriod: '24h',
            limit: 100,
          },
        }
      );

      return response.data.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        count: issue.count,
        lastSeen: issue.lastSeen,
        culprit: issue.culprit,
        metadata: issue.metadata,
      }));
    } catch (error) {
      console.error('Failed to fetch Sentry errors:', error);
      vscode.window.showErrorMessage('Failed to fetch Sentry errors. Check your configuration.');
      return [];
    }
  }

  private findErrorsInFile(document: vscode.TextDocument, errors: SentryError[]): Array<{error: SentryError, line: number}> {
    const fileMatches: Array<{error: SentryError, line: number}> = [];
    const fileName = document.fileName.split('/').pop() || '';
    const text = document.getText();
    const lines = text.split('\n');
    
    errors.forEach(error => {
      let matched = false;
      
      // 1. Match by filename in metadata
      if (error.metadata?.filename && error.metadata.filename.includes(fileName)) {
        // Try to find function name in the file if available
        if (error.metadata.function) {
          const functionMatch = this.findFunctionInFile(lines, error.metadata.function);
          if (functionMatch !== -1) {
            fileMatches.push({error, line: functionMatch});
            matched = true;
          }
        }
        
        if (!matched) {
          // Add to first line if filename matches but no specific function found
          fileMatches.push({error, line: 0});
          matched = true;
        }
      }
      
      // 2. Match by culprit (function/method name)
      if (!matched && error.culprit) {
        const culpritLine = this.findFunctionInFile(lines, error.culprit);
        if (culpritLine !== -1) {
          fileMatches.push({error, line: culpritLine});
          matched = true;
        }
      }
      
      // 3. Match by error title keywords in code
      if (!matched && error.title) {
        const titleKeywords = this.extractKeywords(error.title);
        for (const keyword of titleKeywords) {
          const keywordLine = this.findKeywordInFile(lines, keyword);
          if (keywordLine !== -1) {
            fileMatches.push({error, line: keywordLine});
            break;
          }
        }
      }
    });

    return fileMatches;
  }

  private findFunctionInFile(lines: string[], functionName: string): number {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for function declarations/definitions
      if (line.includes(`function ${functionName}`) ||
          line.includes(`${functionName} =`) ||
          line.includes(`${functionName}(`)) {
        return i;
      }
    }
    return -1;
  }

  private findKeywordInFile(lines: string[], keyword: string): number {
    // Look for keywords in comments or string literals that might indicate error-prone areas
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes(keyword.toLowerCase())) {
        return i;
      }
    }
    return -1;
  }

  private extractKeywords(title: string): string[] {
    // Extract meaningful keywords from error titles
    const commonWords = ['error', 'exception', 'failed', 'cannot', 'undefined', 'null', 'invalid'];
    const words = title.toLowerCase().split(/\s+/);
    return words.filter(word => 
      word.length > 3 && 
      !commonWords.includes(word) &&
      /^[a-zA-Z]+$/.test(word)
    );
  }

  private updateDecorations(editor: vscode.TextEditor) {
    if (!editor) {
      return;
    }

    const document = editor.document;
    const filePath = document.fileName;
    const errors = this.errors.get(filePath) || [];
    
    if (errors.length === 0) {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const decorations: vscode.DecorationOptions[] = [];
    const fileMatches = this.findErrorsInFile(document, errors);

    fileMatches.forEach(({error, line}) => {
      const lineRange = document.lineAt(line).range;
      const decoration: vscode.DecorationOptions = {
        range: lineRange,
        renderOptions: {
          after: {
            contentText: ` 🔥 ${error.count} errors in 24h`,
            color: new vscode.ThemeColor('editorWarning.foreground'),
          },
        },
        hoverMessage: new vscode.MarkdownString(
          `**Sentry Error**: ${error.title}\n\n` +
          `**Count (24h)**: ${error.count}\n\n` +
          `**Last Seen**: ${new Date(error.lastSeen).toLocaleString()}\n\n` +
          `**Culprit**: ${error.culprit || 'Unknown'}`
        ),
      };
      decorations.push(decoration);
    });

    editor.setDecorations(this.decorationType, decorations);
  }

  async refreshErrors() {
    const config = this.getConfiguration();
    
    if (!config.enabled) {
      // Clear all decorations if disabled
      vscode.window.visibleTextEditors.forEach(editor => {
        editor.setDecorations(this.decorationType, []);
      });
      this.updateStatusBar('Disabled');
      return;
    }
    
    if (!config.authToken || !config.organization || !config.project) {
      this.updateStatusBar('Not configured');
      vscode.window.showWarningMessage(
        'Sentry plugin is enabled but not configured. Please set your Sentry credentials in settings.',
        'Open Settings'
      ).then(selection => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'sentryPlugin');
        }
      });
      return;
    }

    try {
      this.updateStatusBar('Loading...');
      const errors = await this.fetchSentryErrors();
      
      // Group errors by potential file association
      this.errors.clear();
      errors.forEach(error => {
        if (error.metadata?.filename) {
          const existing = this.errors.get(error.metadata.filename) || [];
          existing.push(error);
          this.errors.set(error.metadata.filename, existing);
        } else {
          // Add to a general errors list
          const existing = this.errors.get('general') || [];
          existing.push(error);
          this.errors.set('general', existing);
        }
      });

      // Update decorations for all visible editors
      vscode.window.visibleTextEditors.forEach(editor => {
        this.updateDecorations(editor);
      });

      this.updateStatusBar('Ready', errors.length);
      vscode.window.showInformationMessage(`Loaded ${errors.length} Sentry errors`);
    } catch (error) {
      console.error('Error refreshing Sentry data:', error);
      this.updateStatusBar('Error');
      vscode.window.showErrorMessage('Failed to refresh Sentry error data. Check your configuration and network connection.');
    }
  }

  onActiveEditorChanged(editor: vscode.TextEditor | undefined) {
    if (editor) {
      this.updateDecorations(editor);
    }
  }

  private updateStatusBar(status: string, errorCount?: number) {
    if (errorCount !== undefined) {
      this.statusBarItem.text = `$(bug) Sentry: ${errorCount} errors`;
      this.statusBarItem.tooltip = `${errorCount} Sentry errors found. Click to refresh.`;
    } else {
      this.statusBarItem.text = `$(bug) Sentry: ${status}`;
      this.statusBarItem.tooltip = `Sentry Plugin: ${status}. Click to refresh.`;
    }
  }

  dispose() {
    this.decorationType.dispose();
    this.statusBarItem.dispose();
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Sentry plugin is now active!');

  const provider = new SentryErrorProvider();

  // Register commands
  const refreshCommand = vscode.commands.registerCommand('sentry-plugin.refreshErrors', () => {
    provider.refreshErrors();
  });

  // Listen to active editor changes
  const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
    provider.onActiveEditorChanged(editor);
  });

  // Listen to configuration changes
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('sentryPlugin')) {
      provider.refreshErrors();
    }
  });

  // Auto-refresh on activation if configuration is set
  const config = vscode.workspace.getConfiguration('sentryPlugin');
  if (config.get('enabled') && config.get('authToken')) {
    provider.refreshErrors();
  }

  context.subscriptions.push(
    refreshCommand,
    editorChangeDisposable,
    configChangeDisposable,
    provider
  );
}

export function deactivate() {
  console.log('Sentry plugin is now deactivated!');
}