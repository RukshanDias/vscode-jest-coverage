import { Helper } from "./helper";
import * as fs from "fs";
import * as vscode from "vscode";
import { workspacePath } from "./fileMethodSelector";

export class CoverageGenerator {
    private decorationsMap: Map<string, { decorationType: vscode.TextEditorDecorationType; decorations: vscode.DecorationOptions[] }> = new Map();

    public async generateCoverage(testFilePaths: string[], filePaths: string[]): Promise<void> {
        let relativeTestFilePaths = Helper.convertPathToRelative(testFilePaths);
        let relativeFilePaths = Helper.convertPathToRelative(filePaths);

        let command = this.generateCommand(relativeTestFilePaths, relativeFilePaths);
        if (command && workspacePath) {
            await Helper.generateCoverageReport(command, Helper.convertPathToUnix(workspacePath) + "/coverage/coverage-final.json");
            vscode.window.showInformationMessage("view coverage");

            let coverageFilePath = workspacePath + "/coverage/coverage-final.json";
            const coverageData = this.parseCoverageReport(coverageFilePath);
            coverageData.forEach((notCoveredLines: number[][], file: string) => {
                this.highlightNotCoveredLines(file, notCoveredLines);
                Helper.openFileInVscode(file);
            });
        }
    }

    private generateCommand(filePaths: string[], testFilePaths: string[]): string {
        const testFilesStr = JSON.stringify(testFilePaths);
        const coverageFilesStr = filePaths.join(" ");

        let command = `npm test ${coverageFilesStr} -- --coverage --collectCoverageFrom='${testFilesStr}'`;
        return Helper.convertPathToUnix(command);
    }

    public highlightNotCoveredLines(filePath: string, coveredLines: number[][]) {
        const uri = vscode.Uri.file(filePath);
        const coveredLineDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: "rgba(246, 153, 92, 0.4)",
        });
        const decorations: vscode.DecorationOptions[] = [];

        vscode.window.showTextDocument(uri).then((editor) => {
            coveredLines.forEach((line) => {
                const startLine = editor.document.lineAt(line[0] - 1);
                const endLine = editor.document.lineAt(line[2] - 1);

                const decoration: vscode.DecorationOptions = {
                    range: new vscode.Range(line[0] - 1, line[1] - 1, line[2] - 1, line[3] - 1),
                    hoverMessage: "This line is not covered by tests",
                };
                decorations.push(decoration);
            });
            editor.setDecorations(coveredLineDecorationType, decorations);
            this.decorationsMap.set(editor.document.uri.fsPath, { decorationType: coveredLineDecorationType, decorations: decorations });
        });
    }

    public getDecorationsMap(): Map<
        string,
        {
            decorationType: vscode.TextEditorDecorationType;
            decorations: vscode.DecorationOptions[];
        }
    > {
        return this.decorationsMap;
    }

    // Function to remove decorations when file is closed
    public removeDecorations(filePath: string) {
        const decorations = this.decorationsMap.get(filePath);
        if (decorations) {
            this.decorationsMap.delete(filePath);
        }
    }

    // Function to parse Jest coverage report
    private parseCoverageReport(filePath: string): Map<string, number[][]> {
        const report = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const coverageData = new Map<string, number[][]>();

        Object.keys(report).forEach((filename: string) => {
            const fileCoverage = report[filename];
            let coveredLines: number[][] = [];

            coveredLines = [...coveredLines, ...this.getStatementCoverage(fileCoverage)];
            coveredLines = [...coveredLines, ...this.getBranchCoverage(fileCoverage)];
            coveredLines = [...coveredLines, ...this.getFunctionCoverage(fileCoverage)];

            coverageData.set(filename, coveredLines);
        });

        return coverageData;
    }

    private getStatementCoverage(fileCoverage: any): number[][] {
        const coveredLines: number[][] = [];
        Object.keys(fileCoverage.statementMap).forEach((statementKey) => {
            const statementCoverage = fileCoverage.s[statementKey];
            if (statementCoverage !== undefined && statementCoverage == 0) {
                const line = fileCoverage.statementMap[statementKey];
                if (line) {
                    coveredLines.push([line.start.line, line.start.column, line.end.line, line.end.column]);
                }
            }
        });
        return coveredLines;
    }

    private getBranchCoverage(fileCoverage: any): number[][] {
        const coveredLines: number[][] = [];
        Object.keys(fileCoverage.branchMap).forEach((branchKey) => {
            const branchCoverage = fileCoverage.b[branchKey];
            if (branchCoverage !== undefined) {
                const branches = fileCoverage.branchMap[branchKey].locations;
                branches.forEach((branch: any) => {
                    if (branchCoverage[0] > 0 || branchCoverage[1] == 0) {
                        const line = branch;
                        if (this.isLineDataDefined(line)) {
                            coveredLines.push([line.start.line, line.start.column, line.end.line, line.end.column]);
                        }
                    }
                });
            }
        });
        return coveredLines;
    }

    private getFunctionCoverage(fileCoverage: any): number[][] {
        const coveredLines: number[][] = [];
        Object.keys(fileCoverage.fnMap).forEach((functionKey) => {
            const functionCoverage = fileCoverage.f[functionKey];
            if (functionCoverage !== undefined && functionCoverage == 0) {
                const line = fileCoverage.fnMap[functionKey].loc;
                if (this.isLineDataDefined(line)) {
                    coveredLines.push([line.start.line, line.start.column, line.end.line, line.end.column]);
                }
            }
        });
        return coveredLines;
    }

    private isLineDataDefined(line: any): boolean {
        return line.start.line && line.start.column && line.end.line && line.end.column;
    }
}