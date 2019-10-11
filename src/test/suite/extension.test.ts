import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { describe, it, before, beforeEach } from 'mocha';

describe('Extension Test Suite', function() {
	let document: vscode.TextDocument;
	let textEditor: vscode.TextEditor;

	before(async function() {
		document = await vscode.workspace.openTextDocument();
		textEditor = await vscode.window.showTextDocument(document);
	});

	beforeEach(async function() {
		const currentText = textEditor.document.getText();
		const documentTextRange = new vscode.Range(
			textEditor.document.positionAt(0), 
			textEditor.document.positionAt(currentText.length)
		);
		await textEditor.edit(builder => builder.delete(documentTextRange));
	});

	it('can replace in file', async function() {
		const savedRegExp = {
			label: 'Remove numbers',
			regExp: '([a-z]+)[^a-z]*',
			replacePattern: '$1'
		};
		sinon.stub(vscode.window, 'showQuickPick').callsFake(async () => savedRegExp);
		const text = 'abc 123 def 456 !!!';
		const expected = 'abcdef';
		await textEditor.edit(builder => builder.replace(textEditor.document.positionAt(0), text));

		await vscode.commands.executeCommand('regExpSaver.replaceInFile');

		assert.equal(document.getText(), expected);
	});
});
