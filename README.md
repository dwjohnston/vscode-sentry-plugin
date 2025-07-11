# VSCode Sentry Plugin

A VSCode extension that shows inline reporting of how often an error is reported to Sentry.

## Features

- **Inline Error Reporting**: Shows error counts directly in your code editor
- **Real-time Updates**: Fetches latest error data from Sentry
- **Hover Details**: Detailed error information on hover
- **Multi-language Support**: Works with JavaScript, TypeScript, Python, and Java

## Setup

1. Install the extension
2. Configure your Sentry credentials in VSCode settings:
   - `sentryPlugin.authToken`: Your Sentry API authentication token
   - `sentryPlugin.organization`: Your Sentry organization slug
   - `sentryPlugin.project`: Your Sentry project slug

## Usage

1. Open a file in your project
2. The extension will automatically fetch and display error information
3. Use the command "Refresh Sentry Error Data" to manually update
4. Hover over annotated lines to see detailed error information

## Configuration

- `sentryPlugin.enabled`: Enable/disable the plugin (default: true)
- `sentryPlugin.authToken`: Sentry API authentication token
- `sentryPlugin.organization`: Sentry organization slug  
- `sentryPlugin.project`: Sentry project slug

## Requirements

- VSCode 1.74.0 or higher
- Valid Sentry account and API token

## Extension Settings

This extension contributes the following settings:

* `sentryPlugin.enabled`: Enable/disable this extension
* `sentryPlugin.authToken`: Your Sentry API token
* `sentryPlugin.organization`: Your Sentry organization
* `sentryPlugin.project`: Your Sentry project

## Known Issues

- Error matching is currently basic and may not catch all relevant errors
- Only shows errors from the last 24 hours

## Release Notes

### 0.0.1

Initial release of VSCode Sentry Plugin