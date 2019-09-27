import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const commands = { replaceInSelection };
	for (const [name, fn] of Object.entries(commands)) {
		const disposable = vscode.commands.registerCommand(`extension.${name}`, fn);
		context.subscriptions.push(disposable);
	}
}

function replaceInSelection() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const selection = editor.selection;
	if (selection.isEmpty) {
		return;
	}
	const text = editor.document.getText(selection);
	const regExp = new RegExp('(\\w+)=(.+)', 'g');
	const replacePattern = `'$1': $2`;
	const newText = text.replace(regExp, replacePattern);
	editor.edit(builder => builder.replace(selection, newText));
}