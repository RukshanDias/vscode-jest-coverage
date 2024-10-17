import { Helper } from "../helper/helper";
import * as fs from "fs";
import * as vscode from "vscode";
import { SelectionRange } from "./fileMethodSelector.service";
import { Logger } from "../helper/logger";
import { GetCoverageFolderPath, GetTestCoverageCommand, GetworkspacePath } from "../config";
import { CoverageReportParser } from "../helper/coverageReportParser";

export class CoverageGenerator {
    private coverageInfoDecorationsMap: Map<string, { decorationType: vscode.TextEditorDecorationType; decorations: vscode.DecorationOptions[] }> =
        new Map();
    private topLineDecorationsMap: Map<string, { decorationType: vscode.TextEditorDecorationType; decorations: vscode.DecorationOptions[] }> =
        new Map();
    private coverageViewOption: string[] = ["Code inline format", "View coverage report in browser"];

    public async generateCoverage(testFilePaths: string[], fixFilePaths: string[], selectionRange?: SelectionRange): Promise<void> {
        Logger.debug("Generating coverage report.");

        let relativeTestFilePaths = Helper.convertPathToRelative(testFilePaths);
        let relativeFixFilePaths = Helper.convertPathToRelative(fixFilePaths);

        let command = this.generateCommand(relativeTestFilePaths, relativeFixFilePaths);
        let workspacePath = GetworkspacePath();
        if (command && workspacePath) {
            const coverageJsonFilePath = vscode.workspace.getConfiguration("JestCoverage").get<string>("coverageJsonFilePath", "");
            await Helper.generateCoverageReport(command, Helper.convertPathToUnix(workspacePath) + coverageJsonFilePath, relativeTestFilePaths);

            if (!selectionRange) {
                // Retrieve the selected value of Coverage View setting
                const selectedOptionIndex = this.coverageViewOption.findIndex(
                    (option) => option === vscode.workspace.getConfiguration().get("JestCoverage.coverageViewOption")
                );
                Logger.debug('Do not have selection range. Selected view option: ', this.coverageViewOption[selectedOptionIndex]);

                switch (selectedOptionIndex) {
                    case 0:
                        // code inline
                        this.inlineCoverageView(coverageJsonFilePath);
                        break;

                    case 1:
                        // View coverage report in browser
                        for (let i in fixFilePaths) {
                            const fileName = fixFilePaths[i].split("\\").pop();

                            let coverageFolderPath = GetCoverageFolderPath(coverageJsonFilePath);
                            if (coverageFolderPath !== "") {
                                let coverageFilePath = coverageFolderPath + "lcov-report/" + fileName + ".html";
                                if (Helper.isFileAvailable(coverageFilePath)) {
                                    vscode.env.openExternal(vscode.Uri.file(coverageFilePath));
                                } else {
                                    vscode.env.openExternal(vscode.Uri.file(coverageFolderPath + "lcov-report/index.html"));
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
                Logger.debug('Have selection range. Inline coverage view.');
                this.inlineCoverageView(coverageJsonFilePath, selectionRange);

                let coverageReport: vscode.Uri;
                const fileName = fixFilePaths[0].split("\\").pop();

                let coverageFolderPath = GetCoverageFolderPath(coverageJsonFilePath);
                if (coverageFolderPath !== "") {
                    let coverageFilePath = coverageFolderPath + "lcov-report/" + fileName + ".html";
                    if (Helper.isFileAvailable(coverageFilePath)) {
                        coverageReport = vscode.Uri.file(coverageFilePath);
                    } else {
                        coverageReport = vscode.Uri.file(coverageFolderPath + "lcov-report/index.html");
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

        let command = GetTestCoverageCommand(coverageFilesStr, testFilesStr);
        Logger.debug('Generated test coverage command: ', command);

        return Helper.convertPathToUnix(command);
    }

    // --------------------- InlineView & Decorations ---------------------------

    private inlineCoverageView(coverageJsonFilePath: string, selectionRange?: SelectionRange): void {
        const coverageParserInstence: CoverageReportParser = CoverageReportParser.getInstance();
        const workspacePath = GetworkspacePath();
        let coverageFilePath = workspacePath + coverageJsonFilePath;
        const coverageData = coverageParserInstence.parseCoverageReport(coverageFilePath, selectionRange);

        coverageData.forEach((notCoveredLines: number[][], file: string) => {
            this.highlightNotCoveredLines(file, notCoveredLines);
            Helper.openFileInVscode(file);
        });

        if (selectionRange) {
            this.setLineDecoration(selectionRange);
        }
    }

    private highlightNotCoveredLines(filePath: string, coveredLines: number[][]): void {
        const uri = vscode.Uri.file(filePath);
        const unCoveredLineDecorationType = this.uncoveredDecorationType();
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
            editor.setDecorations(unCoveredLineDecorationType, decorations);
            this.coverageInfoDecorationsMap.set(editor.document.uri.fsPath, {
                decorationType: unCoveredLineDecorationType,
                decorations: decorations,
            });
        });
    }

    private setLineDecoration(selectionRange: SelectionRange): void {
        const topLineDecorationType = this.topLineDecorationType();
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const startLine = editor.document.lineAt(selectionRange.start - 1).range;
            const endLine = editor.document.lineAt(selectionRange.end).range;
            const decorations: vscode.DecorationOptions[] = [{ range: startLine }, { range: endLine }];
            editor.setDecorations(topLineDecorationType, decorations);
            this.topLineDecorationsMap.set(editor.document.uri.fsPath, { decorationType: topLineDecorationType, decorations: decorations });
        }
    }

    private uncoveredDecorationType(): vscode.TextEditorDecorationType {
        const coveredLineDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: "rgba(246, 153, 92, 0.4)",
        });
        return coveredLineDecorationType;
    }

    private topLineDecorationType(): vscode.TextEditorDecorationType {
        const topLineDecorationOption: vscode.DecorationRenderOptions = {
            isWholeLine: true,
            borderWidth: `2px 0 0 0`,
            borderStyle: "solid",
            borderColor: "rgba(246, 153, 92, 0.4)",
        };
        return vscode.window.createTextEditorDecorationType(topLineDecorationOption);
    }

    public getCoverageInfoDecorationMap(): Map<string, { decorationType: vscode.TextEditorDecorationType; decorations: vscode.DecorationOptions[] }> {
        return this.coverageInfoDecorationsMap;
    }

    public getTopLineDecorationMap(): Map<string, { decorationType: vscode.TextEditorDecorationType; decorations: vscode.DecorationOptions[] }> {
        return this.topLineDecorationsMap;
    }

    public removeCoverageInfoDecorations(filePath?: string): void {
        if (!filePath) {
            this.coverageInfoDecorationsMap.clear();
        } else {
            const decorations = this.coverageInfoDecorationsMap.get(filePath);
            if (decorations) {
                this.coverageInfoDecorationsMap.delete(filePath);
            }
        }
    }

    public removeTopLineDecorations(): void {
        this.topLineDecorationsMap.clear();
    }

}
