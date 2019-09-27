import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const selection: vscode.Selection = editor.selection;
		if (selection.isEmpty) {
			return;
		}
		const text: string = editor.document.getText(selection);
		const regExp: RegExp = new RegExp('(\w+)=(.+)');
		const newText: string = text.replace(regExp)
		editor.edit(builder => builder.replace(selection, 'haha123'));
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

