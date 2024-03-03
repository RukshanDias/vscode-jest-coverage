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

   
}

export function deactivate() {}
