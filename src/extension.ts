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

  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1em',
        color: new vscode.ThemeColor('editorWarning.foreground'),
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
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
    
    errors.forEach(error => {
      // Simple matching based on filename and function names
      if (error.metadata?.filename && error.metadata.filename.includes(fileName)) {
        // For now, just add to the first line if filename matches
        fileMatches.push({error, line: 0});
      } else if (error.culprit) {
        // Try to find function names in the code
        const text = document.getText();
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
          if (error.culprit && line.includes(error.culprit)) {
            fileMatches.push({error, line: index});
          }
        });
      }
    });

    return fileMatches;
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

    vscode.window.showInformationMessage(`Loaded ${errors.length} Sentry errors`);
  }

  onActiveEditorChanged(editor: vscode.TextEditor | undefined) {
    if (editor) {
      this.updateDecorations(editor);
    }
  }

  dispose() {
    this.decorationType.dispose();
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