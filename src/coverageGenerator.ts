import { Helper } from "./helper";
import * as fs from "fs";
import * as vscode from "vscode";
import { workspacePath } from "./fileMethodSelector";

export class CoverageGenerator {
    private decorationsMap: Map<string, { decorationType: vscode.TextEditorDecorationType; decorations: vscode.DecorationOptions[] }> = new Map();

    public async generateCoverage(filePaths: string[], testFilePaths: string[]): Promise<void> {
        filePaths = Helper.convertPathToRelative(filePaths);
        testFilePaths = Helper.convertPathToRelative(testFilePaths);

        let command = this.generateCommand(filePaths, testFilePaths);
        if (command && workspacePath) {
            await Helper.generateCoverageReport(command, Helper.convertPathToUnix(workspacePath) + "/coverage/coverage-final.json");
            vscode.window.showInformationMessage("view coverage");

            // -----------
            let coverageFilePath = workspacePath + "/coverage/coverage-final.json";
            const coverageData = this.parseCoverageReport(coverageFilePath);
            console.log(coverageData);
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const filePath = activeEditor.document.fileName;
                const coveredLines = coverageData[`"D:\Jest_Demo\js\sum.js"`];
                this.highlightNotCoveredLines(filePath, [3, 13, 16, 17]);
            }
        }
    }

    private generateCommand(filePaths: string[], testFilePaths: string[]): string {
        const testFilesStr = JSON.stringify(testFilePaths);
        const coverageFilesStr = filePaths.join(" ");

        let command = `npm test ${coverageFilesStr} -- --coverage --collectCoverageFrom='${testFilesStr}'`;
        return Helper.convertPathToUnix(command);
    }

    public highlightNotCoveredLines(filePath: string, coveredLines: number[]) {
        const uri = vscode.Uri.file(filePath);
        const coveredLineDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: "rgb(227, 75, 46)",
        });
        const decorations: vscode.DecorationOptions[] = [];

        vscode.window.showTextDocument(uri).then((editor) => {
            coveredLines.forEach((lineNumber) => {
                const line = editor.document.lineAt(lineNumber - 1);
                const decoration: vscode.DecorationOptions = {
                    range: new vscode.Range(line.range.start, line.range.end),
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
    public parseCoverageReport(filePath: string): { [key: string]: number[] } {
        const report = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const coverageData: { [key: string]: number[] } = {};

        Object.keys(report).forEach((filename: string) => {
            const fileCoverage = report[filename];
            let coveredLines: number[] = [];

            coveredLines = [...coveredLines, ...this.getStatementCoverage(fileCoverage)];
            coveredLines = [...coveredLines, ...this.getBranchCoverage(fileCoverage)];
            coveredLines = [...coveredLines, ...this.getFunctionCoverage(fileCoverage)];

            coverageData[`'${filename}'`] = coveredLines;
        });

        return coverageData;
    }

    private getStatementCoverage(fileCoverage: any): number[] {
        const coveredLines: number[] = [];
        Object.keys(fileCoverage.statementMap).forEach((statementKey) => {
            const statementCoverage = fileCoverage.s[statementKey];
            if (statementCoverage !== undefined && statementCoverage == 0) {
                const line = fileCoverage.statementMap[statementKey].start.line;
                coveredLines.push(line);
            }
        });
        return coveredLines;
    }

    private getBranchCoverage(fileCoverage: any): number[] {
        const coveredLines: number[] = [];
        Object.keys(fileCoverage.branchMap).forEach((branchKey) => {
            const branchCoverage = fileCoverage.b[branchKey];
            if (branchCoverage !== undefined) {
                const branches = fileCoverage.branchMap[branchKey].locations;
                branches.forEach((branch: { start: { line: any } }) => {
                    if (branchCoverage[0] > 0 || branchCoverage[1] == 0) {
                        const line = branch.start.line;
                        coveredLines.push(line);
                    }
                });
            }
        });
        return coveredLines;
    }

    private getFunctionCoverage(fileCoverage: any): number[] {
        const coveredLines: number[] = [];
        Object.keys(fileCoverage.fnMap).forEach((functionKey) => {
            const functionCoverage = fileCoverage.f[functionKey];
            if (functionCoverage !== undefined && functionCoverage == 0) {
                const line = fileCoverage.fnMap[functionKey].loc.start.line;
                coveredLines.push(line);
            }
        });
        return coveredLines;
    }
}
