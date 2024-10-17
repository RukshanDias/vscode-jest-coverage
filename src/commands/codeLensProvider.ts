import * as vscode from "vscode";
import { FileMethodSelector } from "../service/fileMethodSelector.service";
import { Logger } from "../helper/logger";

enum commandType {
    Clear,
    ViewInBrowser,
    ReRun,
}

const clearCommand: vscode.Command = {
    title: "Clear",
    command: "jest-coverage.codelens.clear",
    tooltip: "Clear highlights on editor",
};

const viewInBrowserCommand: vscode.Command = {
    title: "View in browser",
    command: "jest-coverage.codelens.browserView",
    tooltip: "View report in browser",
};

const reRunCommand: vscode.Command = {
    title: "Rerun",
    command: "jest-coverage.codelens.rerun",
    tooltip: "re-generate the coverage",
};

function setupCommand(codeLensObj: vscode.CodeLens, type: commandType, args?: any[]): vscode.CodeLens {
    let command: any;
    switch (type) {
        case commandType.Clear:
            command = clearCommand;
            break;
        case commandType.ViewInBrowser:
            command = viewInBrowserCommand;
            break;
        case commandType.ReRun:
            command = reRunCommand;
            if (args) {
                command.arguments = args;
            }
            break;
    }
    codeLensObj.command = command;
    return codeLensObj;
}

/**
 * CodelensProvider Class
 */
export class CodelensProvider implements vscode.CodeLensProvider {
    private codeLenses: vscode.CodeLens[] = [];
    public _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private FMSelector: FileMethodSelector;
    private isVisible: boolean = false;

    constructor(fileMethodSelector: FileMethodSelector) {
        this.FMSelector = fileMethodSelector;

        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        console.log("code lense");
        this.codeLenses = [];
        if (this.isCorrectDocument(document) && this.isVisible) {
            console.log("in");
            let x = this.FMSelector.getSelectionRange();
            let line = x?.start !== undefined ? x.start : 0;
            const range = document.lineAt(line - 1).range;

            // CodeLens clear command
            let codeLensClearCmd = new vscode.CodeLens(range);
            setupCommand(codeLensClearCmd, commandType.Clear);
            this.codeLenses.push(codeLensClearCmd);

            // CodeLens view in browser command
            const codeLensBrowserViewCmd = new vscode.CodeLens(range);
            setupCommand(codeLensBrowserViewCmd, commandType.ViewInBrowser);
            this.codeLenses.push(codeLensBrowserViewCmd);

            // CodeLens rerun command
            const codeLensRerunCmd = new vscode.CodeLens(range);
            const args = [this.FMSelector.getSelectionRange()];
            setupCommand(codeLensRerunCmd, commandType.ReRun, args);
            this.codeLenses.push(codeLensRerunCmd);
        }
        return this.codeLenses;
    }

    public setCodeLenses(codeLenses: vscode.CodeLens[]): void {
        this.codeLenses = codeLenses;
    }

    public setVisibility(visible: boolean): void {
        Logger.debug("Setting Codelense visibility to " + visible);
        this.isVisible = visible;
    }

    private isCorrectDocument(received: vscode.TextDocument): boolean {
        const files: string | undefined = this.FMSelector.getSelectionRange()?.filePath;
        const type: string | undefined = this.FMSelector.getType();
        if (files && type) {
            return files === received.fileName && type === "CodeSelection";
        }
        return false;
    }
}
