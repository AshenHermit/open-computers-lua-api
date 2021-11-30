// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { CodeCompleter } = require('./codeCompleter');
const { OCDocApiProvider } = require('./ocdocApiProvider');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

var apiProvider = new OCDocApiProvider()
var codeCompleter = new CodeCompleter(apiProvider)

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('extension "open-computers-lua-api" is now active');

	codeCompleter.configureLanguage()
	codeCompleter.setupSubscriptions(context.subscriptions)
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
