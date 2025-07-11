# Setup Guide for VSCode Sentry Plugin

## Quick Start

1. **Install the Extension**: This extension is designed to be installed in VSCode
2. **Configure Sentry Settings**: Set up your Sentry API credentials
3. **Open a JavaScript/TypeScript file**: The extension will automatically start working

## Configuration

### Required Settings

You need to configure these settings for the extension to work:

```json
{
  "sentryPlugin.authToken": "your-sentry-auth-token",
  "sentryPlugin.organization": "your-org-slug", 
  "sentryPlugin.project": "your-project-slug"
}
```

### Getting Your Sentry Credentials

1. **Auth Token**: 
   - Go to Sentry → Settings → Account → API → Auth Tokens
   - Create a new token with `project:read` scope
   
2. **Organization Slug**: 
   - Found in your Sentry URL: `https://sentry.io/organizations/[org-slug]/`
   
3. **Project Slug**:
   - Found in your project URL: `https://sentry.io/organizations/[org]/projects/[project-slug]/`

### Optional Settings

```json
{
  "sentryPlugin.enabled": true,  // Enable/disable the plugin
}
```

## How It Works

The extension:

1. **Fetches Error Data**: Connects to Sentry API to get recent errors (last 24 hours)
2. **Analyzes Your Code**: Looks for functions and patterns that match Sentry errors
3. **Shows Inline Annotations**: Displays error counts directly in your editor
4. **Provides Hover Details**: Shows detailed error information when you hover

## Features

### Inline Error Display
- Shows `🔥 X errors in 24h` next to relevant code lines
- Updates automatically when you switch files

### Hover Tooltips
- Detailed error information
- Error count and last seen timestamp
- Error culprit information

### Status Bar
- Shows current plugin status and total error count
- Click to refresh error data

### Commands
- `Refresh Sentry Error Data`: Manually refresh error information

## Troubleshooting

### "Not configured" in status bar
- Make sure all required settings are filled in
- Verify your Sentry auth token has the correct permissions

### No errors showing up
- Check that your auth token has `project:read` scope
- Verify organization and project slugs are correct
- Ensure you're looking at files that have corresponding errors in Sentry

### Network errors
- Check your internet connection
- Verify Sentry is accessible from your network
- Check if you're behind a proxy that might block requests

## Development

To run this extension in development mode:

1. Clone the repository
2. Run `npm install`
3. Run `npm run compile` 
4. Press `F5` in VSCode to open a new Extension Development Host window
5. Open a JavaScript/TypeScript file to test the extension

### Testing

Run the basic tests with:
```bash
node test/extension.test.js
```

## Supported Languages

Currently supports:
- JavaScript (.js)
- TypeScript (.ts)
- Python (.py)
- Java (.java)

## Limitations

- Only shows errors from the last 24 hours
- Error matching is based on function names and keywords
- Requires valid Sentry API access
- May not catch all relevant errors due to matching algorithm limitations