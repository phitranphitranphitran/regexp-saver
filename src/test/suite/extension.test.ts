import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import dedent from 'ts-dedent';
import { describe, it, before, beforeEach , after, afterEach } from 'mocha';
import { SavedItem } from '../../types';

describe('Extension Test Suite', function() {
	let document: vscode.TextDocument;
	let textEditor: vscode.TextEditor;
	let previousSavedItems: any[] | undefined;

	before(async function() {
		// Open a new text editor
		document = await vscode.workspace.openTextDocument();
		textEditor = await vscode.window.showTextDocument(document);

		// Hold onto previously saved items to restore after tests
		previousSavedItems = getSavedItems();
	});

	beforeEach(async function() {
		// Delete all text in the document
		const currentText = textEditor.document.getText();
		const documentTextRange = new vscode.Range(
			textEditor.document.positionAt(0), 
			textEditor.document.positionAt(currentText.length)
		);
		await textEditor.edit(builder => builder.delete(documentTextRange));

		// Clear saved items
		await updateSavedItems(undefined);
	});

	afterEach(function() {
		resetStubbedMethod(vscode.window, 'showQuickPick');
		resetStubbedMethod(vscode.window, 'showInputBox');
	});

	after(async function() {
		// Restore previously saved items
		await updateSavedItems(previousSavedItems);
	});

	it('can replace in file', async function() {
		const savedRegExp = {
			label: 'Replace line with abc if line contains abc',
			regExp: '.*(abc).*',
			replacePattern: '$1'
		};
		await updateSavedItems([savedRegExp]);
		sinon.stub(vscode.window, 'showQuickPick').resolves(savedRegExp);
		const text = dedent`
			abc123 def 456 !!!
			acbac blahblahabc?
			dfbgidng*$%H@IGWhj
			49th34abc ihg94y3`;
		const expected = dedent`
			abc
			abc
			dfbgidng*$%H@IGWhj
			abc`;
		await textEditor.edit(builder => builder.replace(document.positionAt(0), text));

		await vscode.commands.executeCommand('regExpSaver.replaceInFile');
		await delay();

		assert.strictEqual(document.getText(), expected);
	});

	it('can replace in selection', async function() {
		const savedRegExp = {
			label: 'Replace line with abc if line contains abc',
			regExp: '.*(abc).*',
			replacePattern: '$1'
		};
		await updateSavedItems([savedRegExp]);
		sinon.stub(vscode.window, 'showQuickPick').resolves(savedRegExp);
		const text = dedent`
			abc123 def 456 !!!
			acbac blahblahabc?
			dfbgidng*$%H@IGWhj
			49th34abc ihg94y3`;
		const expected = dedent`
			abc123 def 456 !!!
			abc
			dfbgidng*$%H@IGWhj
			49th34abc ihg94y3`;
		await textEditor.edit(builder => builder.replace(document.positionAt(0), text));

		// Select the second line
		textEditor.selection = new vscode.Selection(1, 0, 2, 0);
		await delay();
		await vscode.commands.executeCommand('regExpSaver.replaceInSelection');
		await delay();

		assert.strictEqual(document.getText(), expected);
	});

	it('can delete in file', async function() {
		const savedRegExp = {
			label: 'Remove abc',
			regExp: 'abc'
		};
		await updateSavedItems([savedRegExp]);
		sinon.stub(vscode.window, 'showQuickPick').resolves(savedRegExp);
		const text = dedent`
			abc123 def 456 !!!
			acbac blahblahabc?
			dfbgidng*$%H@IGWhj
			49th34abc ihg94y3`;
		const expected = dedent`
			123 def 456 !!!
			acbac blahblah?
			dfbgidng*$%H@IGWhj
			49th34 ihg94y3`;
		await textEditor.edit(builder => builder.replace(document.positionAt(0), text));

		await vscode.commands.executeCommand('regExpSaver.replaceInFile');
		await delay();

		assert.strictEqual(document.getText(), expected);
	});

	it('can delete in selection', async function() {
		const savedRegExp = {
			label: 'Remove abc',
			regExp: 'abc'
		};
		await updateSavedItems([savedRegExp]);
		sinon.stub(vscode.window, 'showQuickPick').resolves(savedRegExp);
		const text = dedent`
			abc123 def 456 !!!
			acbac blahblahabc?
			dfbgidng*$%H@IGWhj
			49th34abc ihg94y3`;
		const expected = dedent`
			abc123 def 456 !!!
			acbac blahblah?
			dfbgidng*$%H@IGWhj
			49th34abc ihg94y3`;
		await textEditor.edit(builder => builder.replace(document.positionAt(0), text));

		// Select the second line
		textEditor.selection = new vscode.Selection(1, 0, 2, 0);
		await delay();
		await vscode.commands.executeCommand('regExpSaver.replaceInSelection');
		await delay();

		assert.strictEqual(document.getText(), expected);
	});

	it('passes through flags', async function() {
		const savedRegExp = {
			label: 'Replace line with abc if line contains abc',
			regExp: '.*(abc).*',
			replacePattern: '$1',
			flags: 'ig'
		};
		await updateSavedItems([savedRegExp]);
		sinon.stub(vscode.window, 'showQuickPick').resolves(savedRegExp);
		const text = dedent`
			ABC123 def 456 !!!
			acbac blahblahabc?
			dfbgidng*$%H@IGWhj
			49th34abc ihg94y3`;
		const expected = dedent`
			ABC
			abc
			dfbgidng*$%H@IGWhj
			abc`;
		await textEditor.edit(builder => builder.replace(document.positionAt(0), text));

		await vscode.commands.executeCommand('regExpSaver.replaceInFile');
		await delay();

		assert.strictEqual(document.getText(), expected);
	});

	it('can save new item', async function() {
		const stub = sinon.stub(vscode.window, 'showInputBox');
		stub.onCall(0).resolves('.*(abc).*');
		stub.onCall(1).resolves('$1');
		stub.onCall(2).resolves('Replace line with abc if line contains abc');

		await vscode.commands.executeCommand('regExpSaver.saveNew');
		await delay();

		const savedItems = getSavedItems();
		assert.deepEqual(savedItems, [{
			label: 'Replace line with abc if line contains abc',
			regExp: '.*(abc).*',
			replacePattern: '$1'
		}]);
	});
});

function getSavedItems(): SavedItem[] | undefined {
	return vscode.workspace.getConfiguration().get('regExpSaver.saved');
}

async function updateSavedItems(newSavedItems: SavedItem[] | undefined) {
	return vscode.workspace.getConfiguration().update('regExpSaver.saved', newSavedItems, true);
}

function resetStubbedMethod(sourceObject: any, methodName: string) {
	const method = sourceObject[methodName] as any;
	if (method.restore && method.restore.sinon) {
		method.restore();
	}
}

/**
 * It seems like doing some things in the Extension Development Host requires
 * waiting for a little bit before the changes actually apply. For example
 * setting textEditor.selection or executing commands. Not sure which things
 * or when lol.
 */
function delay(time = 25) {
	return new Promise(resolve => setTimeout(resolve, time));
}