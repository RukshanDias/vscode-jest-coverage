import path from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import { workspacePath } from "./fileMethodSelector";

export class Helper {
    static isFileAvailable(uri: string): boolean {
        const fs = require("fs");

        try {
            fs.accessSync(uri, fs.constants.F_OK);
            console.log(`${uri} exists`);
            return true;
        } catch (err) {
            console.error(`${uri} does not exist`);
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

    static async generateCoverageReport(command: string, coverageFilePath: string): Promise<void> {
        try {
            await this.deleteFile(coverageFilePath);
            console.log(`Deleted ${coverageFilePath}. Running coverage command...`);
            await this.executeCommandInTerminal(command);
            console.log("Coverage command completed.");
            const regeneratedFile = await this.watchFile(coverageFilePath);
            console.log(`${regeneratedFile} has been regenerated. Completed.`);
        } catch (err) {
            console.error("Error:", err);
        }
    }
    static executeCommandInTerminal(command: string): Promise<void> {
        return new Promise((resolve) => {
            const terminal: vscode.Terminal = vscode.window.createTerminal("My Terminal");
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
}
