import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import dedent from 'ts-dedent';
import { describe, it, before, beforeEach , after, afterEach } from 'mocha';

describe('Extension Test Suite', function() {
	let document: vscode.TextDocument;
	let textEditor: vscode.TextEditor;
	let previousSavedItems: any[] | undefined;

	before(async function() {
		// Open a new text editor
		document = await vscode.workspace.openTextDocument();
		textEditor = await vscode.window.showTextDocument(document);

		// Hold onto previously saved items to restore after tests
		previousSavedItems = vscode.workspace.getConfiguration().get('regExpSaver.saved');
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
		await vscode.workspace.getConfiguration().update('regExpSaver.saved', undefined, true);
		await vscode.workspace.getConfiguration().update('regExpSaver.savedForWorkspace', undefined, false);
	});

	afterEach(function() {
		resetStubbedMethod(vscode.window, 'showQuickPick');
		resetStubbedMethod(vscode.window, 'showInputBox');
	});

	after(async function() {
		// Restore previously saved items
		await vscode.workspace.getConfiguration().update('regExpSaver.saved', previousSavedItems, true);
	});

	it('can save new RegExp globally', async function() {
		sinon.stub(vscode.window, 'showInputBox')
		.onCall(0).resolves('.*(abc).*')
		.onCall(1).resolves('$1')
		.onCall(2).resolves('Replace line with abc if line contains abc');

		sinon.stub(vscode.window, 'showQuickPick')
		// @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/issues/36436
		.onCall(0).resolves('Global (default)');

		await vscode.commands.executeCommand('regExpSaver.saveNew');
		await delay();

		const savedGlobally = vscode.workspace.getConfiguration().get('regExpSaver.saved');
		assert.deepStrictEqual(savedGlobally, [{
			label: 'Replace line with abc if line contains abc',
			regExp: '.*(abc).*',
			replacePattern: '$1'
		}]);

		const savedForWorkspace = vscode.workspace.getConfiguration().get('regExpSaver.savedForWorkspace');
		assert.deepStrictEqual(savedForWorkspace, []);
	});

	it('can save new RegExp for workspace', async function() {
		sinon.stub(vscode.window, 'showInputBox')
		.onCall(0).resolves('.*(abc).*')
		.onCall(1).resolves('$1')
		.onCall(2).resolves('Replace line with abc if line contains abc');

		sinon.stub(vscode.window, 'showQuickPick')
		// @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/issues/36436
		.onCall(0).resolves('Workspace');

		await vscode.commands.executeCommand('regExpSaver.saveNew');
		await delay();

		const savedGlobally = vscode.workspace.getConfiguration().get('regExpSaver.saved');
		assert.deepStrictEqual(savedGlobally, [])

		const savedForWorkspace = vscode.workspace.getConfiguration().get('regExpSaver.savedForWorkspace');
		assert.deepStrictEqual(savedForWorkspace, [{
			label: 'Replace line with abc if line contains abc',
			regExp: '.*(abc).*',
			replacePattern: '$1'
		}]);
	});

	it('saves new RegExps globally by default', async function() {
		sinon.stub(vscode.window, 'showInputBox')
		.onCall(0).resolves('.*(abc).*')
		.onCall(1).resolves('$1')
		.onCall(2).resolves('Replace line with abc if line contains abc');

		sinon.stub(vscode.window, 'showQuickPick')
		// @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/issues/36436
		.onCall(0).resolves('');

		await vscode.commands.executeCommand('regExpSaver.saveNew');
		await delay();

		const savedGlobally = vscode.workspace.getConfiguration().get('regExpSaver.saved');
		assert.deepStrictEqual(savedGlobally, [{
			label: 'Replace line with abc if line contains abc',
			regExp: '.*(abc).*',
			replacePattern: '$1'
		}]);

		const savedForWorkspace = vscode.workspace.getConfiguration().get('regExpSaver.savedForWorkspace');
		assert.deepStrictEqual(savedForWorkspace, []);
	});

	it('shows both global and workspace items when selecting a RegExp', async function() {
		await vscode.workspace.getConfiguration().update('regExpSaver.savedForWorkspace', [
			{ label: "Workspace RegExp One", regExp: 'W1' },
			{ label: "Workspace RegExp Two", regExp: 'W2' },
		], false);
		await vscode.workspace.getConfiguration().update('regExpSaver.saved', [
			{ label: "Global RegExp One", regExp: 'G1' },
			{ label: "Global RegExp Two", regExp: 'G2' },
		], true);

		const stub = sinon.stub(vscode.window, 'showQuickPick');
		stub.onCall(0).resolves(undefined);

		await vscode.commands.executeCommand('regExpSaver.replaceInFile');
		await delay();

		let quickPickItems = stub.getCall(0).args[0] as vscode.QuickPickItem[];
		quickPickItems = quickPickItems.map((item) => ({ label: item.label, detail: item.detail }));
		assert.deepStrictEqual(quickPickItems, [
			{ label: "Workspace RegExp One", detail: 'W1' },
			{ label: "Workspace RegExp Two", detail: 'W2' },
			{ label: "Global RegExp One", detail: 'G1' },
			{ label: "Global RegExp Two", detail: 'G2' },
		])
	});

	it('can replace in file', async function() {
		const savedRegExp = {
			label: 'Replace line with abc if line contains abc',
			regExp: '.*(abc).*',
			replacePattern: '$1'
		};
		await vscode.workspace.getConfiguration().update('regExpSaver.saved', [savedRegExp], true);
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
		await vscode.workspace.getConfiguration().update('regExpSaver.saved', [savedRegExp], true);
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
		await vscode.workspace.getConfiguration().update('regExpSaver.saved', [savedRegExp], true);
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
		await vscode.workspace.getConfiguration().update('regExpSaver.saved', [savedRegExp], true);
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
			regExpFlags: 'ig'
		};
		await vscode.workspace.getConfiguration().update('regExpSaver.saved', [savedRegExp], true);
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

	// TODO: tests for the Find commands, when vscode exposes the API to read from the Find widget
});

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
