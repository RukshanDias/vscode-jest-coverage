import { Helper } from "./helper";
import * as fs from "fs";
import * as vscode from "vscode";
import { SelectionRange, workspacePath } from "./fileMethodSelector";

export class CoverageGenerator {
    private decorationsMap: Map<string, { decorationType: vscode.TextEditorDecorationType; decorations: vscode.DecorationOptions[] }> = new Map();
    private coverageViewOption: string[] = ["Code inline format", "View coverage report in browser"];

    public async generateCoverage(testFilePaths: string[], fixFilePaths: string[], selectionRange?: SelectionRange): Promise<void> {
        let relativeTestFilePaths = Helper.convertPathToRelative(testFilePaths);
        let relativeFixFilePaths = Helper.convertPathToRelative(fixFilePaths);

        let command = this.generateCommand(relativeTestFilePaths, relativeFixFilePaths);
        if (command && workspacePath) {
            const coverageJsonFilePath = vscode.workspace.getConfiguration("JestCoverage").get<string>("coverageJsonFilePath", "");
            await Helper.generateCoverageReport(command, Helper.convertPathToUnix(workspacePath) + coverageJsonFilePath, relativeTestFilePaths);

            if (!selectionRange) {
                // Retrieve the selected value of Coverage View setting
                const selectedOptionIndex = this.coverageViewOption.findIndex(
                    (option) => option === vscode.workspace.getConfiguration().get("JestCoverage.coverageViewOption")
                );

                switch (selectedOptionIndex) {
                    case 0:
                        // code inline
                        this.inlineCoverageView(coverageJsonFilePath);
                        break;

                    case 1:
                        // View coverage report in browser
                        for (let i in fixFilePaths) {
                            const fileName = fixFilePaths[i].split("\\").pop();
                            let coverageFilePath = "";
                            const match = coverageJsonFilePath.match(/^(.*\/).*coverage-final\.json$/);
                            if (match && match[1]) {
                                coverageFilePath = workspacePath + match[1] + "lcov-report/" + fileName + ".html";
                                if (Helper.isFileAvailable(coverageFilePath)) {
                                    vscode.env.openExternal(vscode.Uri.file(coverageFilePath));
                                } else {
                                    vscode.env.openExternal(vscode.Uri.file(workspacePath + match[1] + "lcov-report/index.html"));
                                    break;
                                }
                            }
                        }
                        break;

                    default:
                        break;
                }
            } else {
                // coverage for selection
                this.inlineCoverageView(coverageJsonFilePath, selectionRange);

                let coverageReport: vscode.Uri;
                const fileName = fixFilePaths[0].split("\\").pop();
                const match = coverageJsonFilePath.match(/^(.*\/).*coverage-final\.json$/);
                if (match && match[1]) {
                    let coverageFilePath = workspacePath + match[1] + "lcov-report/" + fileName + ".html";
                    if (Helper.isFileAvailable(coverageFilePath)) {
                        coverageReport = vscode.Uri.file(coverageFilePath);
                    } else {
                        coverageReport = vscode.Uri.file(workspacePath + match[1] + "lcov-report/index.html");
                    }
                }

                const message = "For better view, check coverage report";
                const actionTitle = "View";

                vscode.window.showInformationMessage(message, actionTitle).then((selection) => {
                    if (selection === actionTitle) {
                        console.log(coverageReport.toString());
                        vscode.env.openExternal(coverageReport);
                    }
                });
            }
        }
    }

    private generateCommand(testFilePaths: string[], fixFilePaths: string[]): string {
        const testFilesStr = JSON.stringify(fixFilePaths);
        const coverageFilesStr = testFilePaths.join(" ");

        let command = `npm test ${coverageFilesStr} -- --coverage --collectCoverageFrom='${testFilesStr}'`;
        return Helper.convertPathToUnix(command);
    }

    private highlightNotCoveredLines(filePath: string, coveredLines: number[][]) {
        const uri = vscode.Uri.file(filePath);
        const coveredLineDecorationType = this.uncoveredDecorationType();
        const decorations: vscode.DecorationOptions[] = [];
        let message: string;
        vscode.window.showTextDocument(uri).then((editor) => {
            coveredLines.forEach((line) => {
                if (line[4] === 1) {
                    message = "Statement not covered.";
                } else if (line[4] === 2) {
                    message = "Branch not covered.";
                } else if (line[4] === 3) {
                    message = "Whole Function not covered.";
                }
                const decoration: vscode.DecorationOptions = {
                    range: new vscode.Range(line[0] - 1, line[1], line[2] - 1, line[3]),
                    hoverMessage: message,
                };
                decorations.push(decoration);
            });
            editor.setDecorations(coveredLineDecorationType, decorations);
            this.decorationsMap.set(editor.document.uri.fsPath, { decorationType: coveredLineDecorationType, decorations: decorations });
        });
    }

    private uncoveredDecorationType(): vscode.TextEditorDecorationType {
        const coveredLineDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: "rgba(246, 153, 92, 0.4)",
        });
        return coveredLineDecorationType;
    }

    private inlineCoverageView(coverageJsonFilePath: string, selectionRange?: SelectionRange): void {
        let coverageFilePath = workspacePath + coverageJsonFilePath;
        const coverageData = this.parseCoverageReport(coverageFilePath, selectionRange);
        coverageData.forEach((notCoveredLines: number[][], file: string) => {
            this.highlightNotCoveredLines(file, notCoveredLines);
            Helper.openFileInVscode(file);
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
    public removeDecorations(filePath?: string) {
        if (!filePath) {
            this.decorationsMap.clear();
        } else {
            const decorations = this.decorationsMap.get(filePath);
            if (decorations) {
                this.decorationsMap.delete(filePath);
            }
        }
    }

    // Function to parse Jest coverage report
    private parseCoverageReport(filePath: string, selectionRange?: SelectionRange): Map<string, number[][]> {
        const report = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const coverageData = new Map<string, number[][]>();

        Object.keys(report).forEach((filename: string) => {
            const fileCoverage = report[filename];
            let coveredLines: number[][] = [];

            coveredLines = [...coveredLines, ...this.getStatementCoverage(fileCoverage, selectionRange)];
            coveredLines = [...coveredLines, ...this.getBranchCoverage(fileCoverage, selectionRange)];
            coveredLines = [...coveredLines, ...this.getFunctionCoverage(fileCoverage, selectionRange)];

            coverageData.set(filename, coveredLines);
        });

        return coverageData;
    }

    private getStatementCoverage(fileCoverage: any, selectionRange?: SelectionRange): number[][] {
        const coveredLines: number[][] = [];
        Object.keys(fileCoverage.statementMap).forEach((statementKey) => {
            const statementCoverage = fileCoverage.s[statementKey];
            if (statementCoverage !== undefined && statementCoverage === 0) {
                const line = fileCoverage.statementMap[statementKey];
                if (line) {
                    if (selectionRange && selectionRange.start <= line.start.line && selectionRange.end >= line.start.line) {
                        coveredLines.push(this.parseLineData(line, 1));
                    } else if (!selectionRange) {
                        coveredLines.push(this.parseLineData(line, 1));
                    }
                }
            }
        });
        return coveredLines;
    }

    private getBranchCoverage(fileCoverage: any, selectionRange?: SelectionRange): number[][] {
        const coveredLines: number[][] = [];
        Object.keys(fileCoverage.branchMap).forEach((branchKey) => {
            const branchCoverage = fileCoverage.b[branchKey];
            if (branchCoverage !== undefined) {
                const branches = fileCoverage.branchMap[branchKey].locations;
                let i: number = 0;
                branches.forEach((branch: any) => {
                    if (branchCoverage[i] === 0 && branch.end.column !== null) {
                        const line = branch;
                        if (selectionRange && selectionRange.start <= line.start.line && selectionRange.end >= line.start.line) {
                            coveredLines.push(this.parseLineData(line, 2));
                        } else if (!selectionRange) {
                            coveredLines.push(this.parseLineData(line, 2));
                        }
                    }
                    i++;
                });
            }
        });
        return coveredLines;
    }

    private getFunctionCoverage(fileCoverage: any, selectionRange?: SelectionRange): number[][] {
        const coveredLines: number[][] = [];
        Object.keys(fileCoverage.fnMap).forEach((functionKey) => {
            const functionCoverage = fileCoverage.f[functionKey];
            if (functionCoverage !== undefined && functionCoverage === 0) {
                const line = fileCoverage.fnMap[functionKey].decl;
                if (selectionRange && selectionRange.start <= line.start.line && selectionRange.end >= line.start.line) {
                    coveredLines.push(this.parseLineData(line, 3));
                } else if (!selectionRange) {
                    coveredLines.push(this.parseLineData(line, 3));
                }
            }
        });
        return coveredLines;
    }

    /**
     * @param line : start end lines with line and column values
     * @param type : coverage type. 1=statement, 2=branch, 3=function
     * @returns
     */
    private parseLineData(line: any, type: number): number[] {
        let startLine: number = line.start.line !== null ? line.start.line : 0;
        let startCol: number = line.start.column !== null ? line.start.column : 0;
        let endLine: number = line.end.line !== null ? line.end.line : 0;
        let endCol: number = line.end.column !== null ? line.end.column : startCol + 1;
        return [startLine, startCol, endLine, endCol, type];
    }
}
