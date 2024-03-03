import * as vscode from "vscode";

export class FileMethodSelector {
    private filePaths: string[] | undefined;
    private selectionRange: SelectionRange | undefined;
    private type: CoverageType | undefined;

    public getFilePath(uris: vscode.Uri[]): void {
        const filePaths: string[] = [];
        for (const uri of uris) {
            if (uri && uri.scheme === "file") {
                filePaths.push(uri.fsPath);
            } else {
                vscode.window.showErrorMessage("Invalid file selected.");
                return undefined;
            }
        }
        this.filePaths = filePaths;
    }

    public captureSelectionRange(editor: vscode.TextEditor): void {
        const selection = editor.selection;
        const startLine = selection.start.line + 1;
        const endLine = selection.end.line + 1;
        const range: SelectionRange = {
            start: startLine,
            end: endLine,
        };
        this.selectionRange = range;
    }

    public clear(): void {
        this.filePaths = undefined;
        this.selectionRange = undefined;
        this.type = undefined;
    }

    public setCoverageType(type: CoverageType): void {
        this.type = type;
    }

    public getFilePaths(): string[] | undefined {
        return this.filePaths;
    }

    public getSelectionRange(): SelectionRange | undefined {
        return this.selectionRange;
    }

    public getType(): CoverageType | undefined {
        return this.type;
    }
}

export type SelectionRange = {
    start: number;
    end: number;
};

export type CoverageType = "MultiFile" | "SingleFile" | "CodeSelection";
