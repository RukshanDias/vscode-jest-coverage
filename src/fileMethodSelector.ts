import * as vscode from "vscode";
import { Helper } from "./helper";

export class FileMethodSelector {
    private fixFilePaths: string[] | undefined;
    private testFilePaths: string[] | undefined;
    private selectionRange: SelectionRange | undefined;
    private type: CoverageType | undefined;

    public captureTestFilePaths(uris: vscode.Uri[]): void {
        const filePaths: string[] = [];
        for (const uri of uris) {
            if (uri && uri.scheme === "file") {
                filePaths.push(uri.fsPath);
            } else {
                vscode.window.showErrorMessage("Invalid file selected.");
                return undefined;
            }
        }
        this.testFilePaths = filePaths;
    }

    public captureSelectionRange(editor: vscode.TextEditor): void {
        const selection = editor.selection;
        const startLine = selection.start.line + 1;
        const endLine = selection.end.line + 1;
        const range: SelectionRange = {
            filePath: editor.document.uri.fsPath,
            start: startLine,
            end: endLine,
        };
        this.selectionRange = range;
    }

    public captureFixFilePaths(): void {
        const capturedFixFilePaths: string[] = [];
        if (this.testFilePaths) {
            for (const file of this.testFilePaths) {
                const fileExtension = file.split(".").pop();
                const testFileFormat = vscode.workspace.getConfiguration("JestCoverage").get<string>("testFileFormat", "");
                let testFilePath = file.replace(new RegExp(`${testFileFormat}$`), "." + fileExtension);
                if (Helper.isFileAvailable(testFilePath)) {
                    capturedFixFilePaths.push(testFilePath);
                } else {
                    capturedFixFilePaths.push("");
                }
            }
            this.fixFilePaths = capturedFixFilePaths;
        }
    }

    public captureTestFileFromFixFile(uri: vscode.Uri): void {
        const file = uri.fsPath;
        const fileExtension = file.split(".").pop();
        const testFileFormat = vscode.workspace.getConfiguration("JestCoverage").get<string>("testFileFormat", "");
        let testFilePath = file.replace("." + fileExtension, testFileFormat);
        if (Helper.isFileAvailable(testFilePath)) {
            this.testFilePaths = [testFilePath];
        } else {
            vscode.window.showInformationMessage("No test file created for this file.");
        }
    }

    public clear(): void {
        this.testFilePaths = undefined;
        this.fixFilePaths = undefined;
        this.selectionRange = undefined;
        this.type = undefined;
    }

    public setCoverageType(type: CoverageType): void {
        this.type = type;
    }

    public setSelectionRange(selectionRange: SelectionRange): void {
        this.selectionRange = selectionRange;
    }

    public getTestFilePaths(): string[] | undefined {
        return this.testFilePaths;
    }

    public getFixFilePaths(): string[] | undefined {
        return this.fixFilePaths;
    }

    public getSelectionRange(): SelectionRange | undefined {
        return this.selectionRange;
    }

    public getType(): CoverageType | undefined {
        return this.type;
    }
}

export type SelectionRange = {
    filePath: string;
    start: number;
    end: number;
};

export type CoverageType = "MultiFile" | "SingleFile" | "CodeSelection";

export const workspacePath = vscode.workspace.rootPath;
