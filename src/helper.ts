import path from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import { workspacePath } from "./fileMethodSelector";

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
        const relativePaths = paths.map((file) => path.relative(workspacePath!, file));
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
                name: "Jest Coverage",
                shellPath: terminalPath,
            };

            const terminal: vscode.Terminal = vscode.window.createTerminal(terminalOption);
            terminal.sendText(command);
            terminal.show();
            resolve();
        });
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
                } else {
                    resolve();
                }
            });
        });
    }

    static async openFileInVscode(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, { preview: false });
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
