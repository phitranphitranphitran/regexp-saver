import * as vscode from 'vscode';
import { SavedItem } from './types';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.concat([
		vscode.commands.registerCommand('regExpSaver.saveNew', saveNew),
		vscode.commands.registerTextEditorCommand('regExpSaver.findInFile', findInFile),
		vscode.commands.registerTextEditorCommand('regExpSaver.findInSelection', findInSelection),
		vscode.commands.registerTextEditorCommand('regExpSaver.replaceInFile', replaceInFile),
		vscode.commands.registerTextEditorCommand('regExpSaver.replaceInSelection', replaceInSelection),
	]);
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
		prompt: '(Optional) Enter your replace pattern, or blank to delete all matches',
		ignoreFocusOut: true
	});
	if (replacePattern === undefined) {
		return;
	}

	const label = await vscode.window.showInputBox({ 
		prompt: 'Enter a label for your new RegExp',
		ignoreFocusOut: true
	});
	if (label === undefined) {
		return;
	}

	const globalOrWorkspace = await vscode.window.showQuickPick(
		['Global (default)', 'Workspace'],
    { title: 'Save RegExp globally or just for this workspace?', ignoreFocusOut: true }
	);
  if (globalOrWorkspace === undefined) {
    return;
  }
  const isGlobal = globalOrWorkspace !== 'Workspace'
  const configTarget = isGlobal ? 'regExpSaver.saved' : 'regExpSaver.savedForWorkspace';

	const newItem = { label, regExp, replacePattern };
	const config = vscode.workspace.getConfiguration();
	const savedItems: any[] = config.get(configTarget, []);
	const newItems = savedItems.concat(newItem);
	await config.update(configTarget, newItems, isGlobal);

	vscode.window.showInformationMessage('RegExp saved');
}

async function findInFile() {
	const savedItem = await pickSavedItem();
	if (!savedItem) {
		return;
	}
  return openFindWidget(savedItem);
}

async function findInSelection() {
  const savedItem = await pickSavedItem();
	if (!savedItem) {
		return;
	}
  return openFindWidget(savedItem, { findInSelection: true });
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

async function replaceInSelection(textEditor: vscode.TextEditor) {
	const { selection } = textEditor;
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

/**
 * Show a QuickPick menu for the user to select a saved RegExp to use.
 * If none is selected, return undefined.
 */
async function pickSavedItem(): Promise<SavedItem | undefined> {
	const configuration = vscode.workspace.getConfiguration();
	const savedItemsGlobally: any[] = configuration.get('regExpSaver.saved', []);
	const savedItemsForWorkspace: any[] = configuration.get('regExpSaver.savedForWorkspace', [])
	const savedItems = [...savedItemsForWorkspace, ...savedItemsGlobally];
	if (!savedItems.length) {
		vscode.window.showErrorMessage('No RegExps were saved yet');
		return;
	}
	const savedItem = await vscode.window.showQuickPick(
		savedItems.map(item => ({
      ...item,
      label: item.label || '(No label)',
      detail: item.regExp,
    })),
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

async function openFindWidget(savedItem: SavedItem, args: Record<string, any> = {}) {
	// https://github.com/microsoft/vscode/commit/8e96e0b389aedf46423431487190b878d4243edb#diff-444cc462cb29242433c26a3b0c72f7cae991cfcd26f4d493b5fb28586426e2bd
	vscode.commands.executeCommand('editor.actions.findWithArgs', {
		searchString: savedItem.regExp,
		replaceString: savedItem.replacePattern,
		isRegex: true,
		...args
	});
}

function replace({ textEditor, savedItem, currentText, range }: {
	textEditor: vscode.TextEditor, 
	savedItem: SavedItem, 
	currentText: string, 
	range: vscode.Range,
}) {
	const regExp = new RegExp(savedItem.regExp, savedItem.regExpFlags || 'g');
	const newText = currentText.replace(regExp, savedItem.replacePattern || '');
	return textEditor.edit(builder => builder.replace(range, newText));
}
