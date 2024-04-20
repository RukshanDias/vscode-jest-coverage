import * as vscode from "vscode";
import { FileMethodSelector } from "./fileMethodSelector";

enum commandType {
    Clear,
}

const clearCommand: vscode.Command = {
    title: "Clear",
    command: "jest-coverage.codelens.clear",
    tooltip: "Clear highlights on editor",
};

function setupCommand(codeLensObj: vscode.CodeLens, command: commandType): vscode.CodeLens {
    let x: any;
    switch (command) {
        case commandType.Clear:
            x = clearCommand;
            break;
    }
    codeLensObj.command = x;
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
        }
        return this.codeLenses;
    }

    public setCodeLenses(codeLenses: vscode.CodeLens[]): void {
        this.codeLenses = codeLenses;
    }

    public setVisibility(visible: boolean): void {
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
