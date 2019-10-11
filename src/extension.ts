import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.concat([
		vscode.commands.registerTextEditorCommand('extension.replaceInSelection', replaceInSelection),
		vscode.commands.registerTextEditorCommand('extension.replaceInFile', replaceInFile),
		vscode.commands.registerCommand('extension.saveNew', saveNew),
	]);
}

async function replaceInSelection(textEditor: vscode.TextEditor) {
	const selection = textEditor.selection;
	if (selection.isEmpty) {
		vscode.window.showErrorMessage('No selection made');
		return;
	}
	const pickedItem = await pickSavedItem();
	if (!pickedItem) {
		return;
	}
	const currentText = textEditor.document.getText(selection);
	replace({ textEditor, pickedItem, currentText, range: selection });
}

async function replaceInFile(textEditor: vscode.TextEditor) {
	const pickedItem = await pickSavedItem();
	if (!pickedItem) {
		return;
	}
	const currentText = textEditor.document.getText();
	const documentTextRange = new vscode.Range(
		textEditor.document.positionAt(0), 
		textEditor.document.positionAt(currentText.length - 1)
	);
	replace({ textEditor, pickedItem, currentText, range: documentTextRange });
}

async function saveNew() {
	const regExp = await vscode.window.showInputBox({ 
		prompt: 'Enter your regular expression',
		ignoreFocusOut: true
	});
	if (!regExp) {
		return;
	}
	const replacePattern = await vscode.window.showInputBox({ 
		prompt: 'Enter your replace pattern, or blank to delete all matches',
		ignoreFocusOut: true
	});
	if (replacePattern === undefined) {
		return;
	}
	const name = await vscode.window.showInputBox({ 
		prompt: 'Enter a name for your new RegExp',
		ignoreFocusOut: true
	});
	if (!name) {
		return;
	}
	const newItem = { name, regExp, replacePattern };
	const configuration = vscode.workspace.getConfiguration();
	const savedItems: any[] | undefined = configuration.get('regExpSaver.saved');
	const newItems = (savedItems || []).concat(newItem);
	configuration.update('regExpSaver.saved', newItems, true);
	vscode.window.showInformationMessage('RegExp saved');
}

/**
 * Show a QuickPick menu for the user to select a saved RegExp to use.
 * If none is selected, return undefined.
 */
async function pickSavedItem(): Promise<SavedItem | undefined> {
	const configuration = vscode.workspace.getConfiguration();
	const savedItems: any[] | undefined = configuration.get('regExpSaver.saved');
	if (!savedItems || !savedItems.length) {
		vscode.window.showErrorMessage('No RegExps were saved yet');
		return;
	}
	const quickPickItems = savedItems.map(item => ({ 
		label: item.name || '(No name)', 
		...item
	}));
	const pickedItem = await vscode.window.showQuickPick(
		quickPickItems,
		{ placeHolder: 'Select a saved RegExp' }
	);
	if (!pickedItem) {
		return;
	}
	if (!pickedItem.regExp) {
		vscode.window.showErrorMessage('Selected RegExp has no regExp specified');
		return;
	}
	return pickedItem;
}

function replace({ textEditor, pickedItem, currentText, range }: {
	textEditor: vscode.TextEditor, 
	pickedItem: SavedItem, 
	currentText: string, 
	range: vscode.Range,
}) {
	const regExp = new RegExp(pickedItem.regExp, pickedItem.flags || 'g');
	const newText = currentText.replace(regExp, pickedItem.replacePattern || '');
	textEditor.edit(builder => builder.replace(range, newText));
}

interface SavedItem {
	name: string;
	regExp: string;
	replacePattern?: string;
	flags?: string;
}