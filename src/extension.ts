import * as vscode from 'vscode';
import { stringify } from 'querystring';

export function activate(context: vscode.ExtensionContext) {
	const commands = { replaceInSelection };
	for (const [name, fn] of Object.entries(commands)) {
		const disposable = vscode.commands.registerCommand(`extension.${name}`, fn);
		context.subscriptions.push(disposable);
	}
}

async function replaceInSelection() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const selection = editor.selection;
	if (selection.isEmpty) {
		return;
	}
	const configuration = vscode.workspace.getConfiguration();
	const savedItems: SavedItem[] | undefined = configuration.get('regExpSaver.saved');
	if (!savedItems || !savedItems.length) {
		vscode.window.showErrorMessage('No RegExps were saved yet');
		return;
	}
	const pickedItem = await vscode.window.showQuickPick(
		savedItems.map(item => ({ label: item.name || '(No name)', ...item })), 
		{ placeHolder: 'Select a saved RegExp' }
	);
	if (!pickedItem) {
		return;
	}
	if (!pickedItem.regExp) {
		vscode.window.showErrorMessage('Selected RegExp has no regExp specified');
		return;
	}
	if (!pickedItem.replacePattern) {
		vscode.window.showErrorMessage('Selected RegExp has no replacePattern specified');
		return;
	}
	const text = editor.document.getText(selection);
	const regExp = new RegExp(pickedItem.regExp, pickedItem.flags || 'g');
	const newText = text.replace(regExp, pickedItem.replacePattern);
	editor.edit(builder => builder.replace(selection, newText));
}

interface SavedItem {
	name?: string;
	regExp?: string;
	replacePattern?: string;
	flags?: string;
}