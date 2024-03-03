import path from "path";
import * as vscode from "vscode";
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

    static convertPathToUnix(path: string) {
        return path.replace(/\\+/g, "/");
    }

    static convertPathToRelative(paths: string[]): string[] {
        const relativePaths = paths.map((file) => path.relative(workspacePath!, file));
        return relativePaths;
    }

    static async executeCommandInTerminal(command: string): Promise<void> {
        const terminal: vscode.Terminal = vscode.window.createTerminal("My Terminal");
        terminal.sendText(command);
        terminal.show();
    }
}
