import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.concat([
		vscode.commands.registerTextEditorCommand('regExpSaver.replaceInSelection', replaceInSelection),
		vscode.commands.registerTextEditorCommand('regExpSaver.replaceInFile', replaceInFile),
		vscode.commands.registerCommand('regExpSaver.saveNew', saveNew),
	]);
}

async function replaceInSelection(textEditor: vscode.TextEditor) {
	const selection = textEditor.selection;
	if (selection.isEmpty) {
		vscode.window.showErrorMessage('No selection made');
		return;
	}
	const savedItem = await pickSavedItem();
	if (!savedItem) {
		return;
	}
	const currentText = textEditor.document.getText(selection);
	return replace({ textEditor, savedItem, currentText, range: selection });
}

async function replaceInFile(textEditor: vscode.TextEditor) {
	const savedItem = await pickSavedItem();
	if (!savedItem) {
		return;
	}
	const currentText = textEditor.document.getText();
	const documentTextRange = new vscode.Range(
		textEditor.document.positionAt(0), 
		textEditor.document.positionAt(currentText.length)
	);
	return replace({ textEditor, savedItem, currentText, range: documentTextRange });
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
	const label = await vscode.window.showInputBox({ 
		prompt: 'Enter a label for your new RegExp',
		ignoreFocusOut: true
	});
	if (!label) {
		return;
	}
	const newItem = { label, regExp, replacePattern };
	const configuration = vscode.workspace.getConfiguration();
	const savedItems: any[] | undefined = configuration.get('regExpSaver.saved');
	const newItems = (savedItems || []).concat(newItem);
	await configuration.update('regExpSaver.saved', newItems, true);
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
	const savedItem = await vscode.window.showQuickPick(
		savedItems.map(item => ({ label: '(No label)', ...item })),
		{ placeHolder: 'Select a saved RegExp' }
	);
	if (!savedItem) {
		return;
	}
	if (!savedItem.regExp) {
		vscode.window.showErrorMessage('Selected RegExp has no regExp specified');
		return;
	}
	return savedItem;
}

function replace({ textEditor, savedItem, currentText, range }: {
	textEditor: vscode.TextEditor, 
	savedItem: SavedItem, 
	currentText: string, 
	range: vscode.Range,
}) {
	const regExp = new RegExp(savedItem.regExp, savedItem.flags || 'g');
	const newText = currentText.replace(regExp, savedItem.replacePattern || '');
	return textEditor.edit(builder => builder.replace(range, newText));
}

interface SavedItem {
	label: string;
	regExp: string;
	replacePattern?: string;
	flags?: string;
}