import path from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import { FileMethodSelector } from "../service/fileMethodSelector.service";
import { Logger } from "./logger";
import { CoverageGenerator } from "../service/coverageGenerator.service";
import { GetTerminalName, GetworkspacePath } from "../config";

export class Helper {
    static isFileAvailable(uri: string): boolean {
        const fs = require("fs");

        try {
            fs.accessSync(uri, fs.constants.F_OK);
            return true;
        } catch (err) {
            return false;
        }
    }

    static convertPathToUnix(path: string): string {
        return path.replace(/\\+/g, "/");
    }

    static convertPathToRelative(paths: string[]): string[] {
        const relativePaths = paths.map((file) => path.relative(GetworkspacePath()!, file));
        return relativePaths;
    }

    static async generateCoverageReport(command: string, coverageFilePath: string, testFilePaths: string[]): Promise<void> {
        try {
            await this.deleteFile(coverageFilePath);
            await this.executeCommandInTerminal(command);
            let message: string = "";
            for (let i = 0; i < testFilePaths.length; i++) {
                message += ` -${i + 1}. ${testFilePaths[i]} `;
            }
            vscode.window.showInformationMessage("Generating coverage..." + message);
            const regeneratedFile = await this.watchFile(coverageFilePath);
        } catch (err) {
            console.error("Error:", err);
        }
    }
    static executeCommandInTerminal(command: string): Promise<void> {
        return new Promise((resolve) => {
            const gitBashPath = vscode.workspace.getConfiguration("JestCoverage").get<string>("gitBashPath", "");
            const bashPath = "/bin/bash";
            let terminalPath: string | undefined = undefined;

            if (this.isFileAvailable(gitBashPath)) {
                terminalPath = gitBashPath;
            } else if (this.isFileAvailable(bashPath)) {
                terminalPath = bashPath;
            }

            const terminalOption: vscode.TerminalOptions = {
                name: GetTerminalName(),
                shellPath: terminalPath,
            };

            const terminal: vscode.Terminal = vscode.window.createTerminal(terminalOption);
            terminal.sendText(command);
            terminal.show();
            resolve();
        });
    }

    static clearPreviousData(fileMethodSelector: FileMethodSelector, coverageGenerator: CoverageGenerator) {
        // Kill previous terminal
        vscode.window.terminals.forEach((terminal: vscode.Terminal) => {
            if (terminal.name === GetTerminalName()) {
                terminal.dispose();
            }
        });
        fileMethodSelector.clear();

        if (coverageGenerator.getCoverageInfoDecorationMap().size > 0) {
            coverageGenerator.removeCoverageInfoDecorations();
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                vscode.commands.executeCommand("workbench.action.closeActiveEditor");
                Helper.openFileInVscode(editor.document.uri.fsPath);
            }
        }
        Logger.debug("Cleared previous data: terminal, fileMethodSelector, coverageInfoDecorations");
    }

    static watchFile(filePath: string): Promise<string> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (fs.existsSync(filePath)) {
                    clearInterval(intervalId);
                    resolve(filePath);
                }
            }, 2000);
        });
    }

    static deleteFile(filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
                if (err && err.code !== "ENOENT") {
                    reject(err);
                } else if (err && err.code === "ENOENT") {
                    vscode.window.showErrorMessage("No coverage file found.\nPls select the correct file in settings.");
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    static async openFileInVscode(filePath: string): Promise<vscode.TextEditor | undefined> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document, { preview: false });
            return editor;
        } catch (error) {
            console.error("Error:", error);
        }
    }

    static haveTestFileFormat(files: vscode.Uri[]): boolean {
        const testFilePattern = vscode.workspace.getConfiguration("JestCoverage").get<string>("testFileFormat", "");
        for (const uri of files) {
            if (!uri.path.endsWith(testFilePattern)) {
                return false;
            }
        }
        return true;
    }

    static removeSelection(editor: vscode.TextEditor): void {
        // Replace with an empty selection
        editor.selection = new vscode.Selection(editor.selection.active, editor.selection.active);
    }
}
