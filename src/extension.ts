import * as vscode from "vscode";
import { FileMethodSelector } from "./fileMethodSelector";

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "jest-coverage" is now active!');

    let fileMethodSelector = new FileMethodSelector();

    let disposable = vscode.commands.registerCommand("jest-coverage.getFilePath", (uris: vscode.Uri[]) => {
        fileMethodSelector.getFilePath(uris);
        let filePaths = fileMethodSelector.getFilePaths();
        if (filePaths) {
            for (const filePath of filePaths) {
                vscode.window.showInformationMessage(filePath);
                console.log(filePath);
            }
        }
    });

    context.subscriptions.push(disposable);

    // ----------------------------- Event Listeners ---------------------------------------
    // Register the command for context menu
    const disposableContextMenu = vscode.commands.registerCommand(
        "jest-coverage.contextMenuFilePathOption",
        (contextSelection: vscode.Uri, allSelections: vscode.Uri[]) => {
            vscode.commands.executeCommand("jest-coverage.getFilePath", allSelections);
        }
    );

    // Register the command for Source Control Panel
    const disposableSCM = vscode.commands.registerCommand("jest-coverage.sourceControlMenuFilePathOption", async (...file) => {
        const uris = file.map((item) => item.resourceUri);
        vscode.commands.executeCommand("jest-coverage.getFilePath", uris);
    });

    // Register the command for code selection
    const disposableMethod = vscode.commands.registerCommand("jest-coverage.method", (uri: vscode.Uri) => {
        fileMethodSelector.getFilePath([uri]);
        let filePaths = fileMethodSelector.getFilePaths();
        if (filePaths) {
            for (const filePath of filePaths) {
                vscode.window.showInformationMessage(filePath);
                console.log(filePath);
            }
        }
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            fileMethodSelector.captureSelectionRange(editor);
            let selection = fileMethodSelector.getSelectionRange();
            vscode.window.showInformationMessage(`Selected lines: ${selection?.start} to ${selection?.end}`);
        } else {
            vscode.window.showErrorMessage("No file is opened.");
        }
    });

    context.subscriptions.push(disposableMethod);
    context.subscriptions.push(disposableContextMenu);
    context.subscriptions.push(disposableSCM);
}

export function deactivate() {}
