import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const commands = { replaceInSelection, replaceInFile };
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
	const pickedItem = await pickSavedItem({ validateReplace: true });
	if (!pickedItem) {
		return;
	}
	const text = editor.document.getText(selection);
	const newText = getNewText(pickedItem, text);
	editor.edit(builder => builder.replace(selection, newText));
}

async function replaceInFile() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const pickedItem = await pickSavedItem({ validateReplace: true });
	if (!pickedItem) {
		return;
	}
	const text = editor.document.getText();
	const newText = getNewText(pickedItem, text);
	const textRange = new vscode.Range(
		editor.document.positionAt(0), 
		editor.document.positionAt(text.length - 1)
	);
	editor.edit(builder => builder.replace(textRange, newText));
}

async function pickSavedItem({ validateReplace = false } = {}): Promise<SavedItem | undefined> {
	const configuration = vscode.workspace.getConfiguration();
	const savedItems: any[] | undefined = configuration.get('regExpSaver.saved');
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
	if (validateReplace && !pickedItem.replacePattern) {
		vscode.window.showErrorMessage('Selected RegExp has no replacePattern specified');
		return;
	}
	return pickedItem;
}

function getNewText(pickedItem: SavedItem, text: string): string {
	const regExp = new RegExp(pickedItem.regExp, pickedItem.flags || 'g');
	return text.replace(regExp, pickedItem.replacePattern);
}

interface SavedItem {
	name: string;
	regExp: string;
	replacePattern: string;
	flags?: string;
}