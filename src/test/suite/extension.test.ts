import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import dedent from 'ts-dedent';
import { describe, it, before, beforeEach } from 'mocha';

describe('Extension Test Suite', function() {
	let document: vscode.TextDocument;
	let textEditor: vscode.TextEditor;

	before(async function() {
		// Open a new text editor
		document = await vscode.workspace.openTextDocument();
		textEditor = await vscode.window.showTextDocument(document);
	});

	beforeEach(async function() {
		// Delete all text in the document
		const currentText = textEditor.document.getText();
		const documentTextRange = new vscode.Range(
			textEditor.document.positionAt(0), 
			textEditor.document.positionAt(currentText.length)
		);
		await textEditor.edit(builder => builder.delete(documentTextRange));
	});

	it('can replace in file', async function() {
		const savedRegExp = {
			label: 'Replace line with abc if line contains abc',
			regExp: '.*(abc).*',
			replacePattern: '$1'
		};
		sinon.stub(vscode.window, 'showQuickPick').callsFake(async () => savedRegExp);
		const text = dedent`
			abc 123 def 456 !!!
			acbac blahblahabc?
			dfbgidng*$%H@IGWhj
			49th34abc ihg94y3`;
		const expected = dedent`
			abc
			abc
			dfbgidng*$%H@IGWhj
			abc`;
		await textEditor.edit(builder => builder.replace(textEditor.document.positionAt(0), text));

		await vscode.commands.executeCommand('regExpSaver.replaceInFile');

		assert.equal(document.getText(), expected);
	});
});
