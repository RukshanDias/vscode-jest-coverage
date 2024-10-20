import * as vscode from 'vscode';
import { Helper } from './helper/helper';

const LOG_LEVEL = "info";
const WorkspacePath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
const TerminalName = "Jest Coverage";

export function GetLogLevel(): string {
    return LOG_LEVEL;
}
export function GetworkspacePath(): string|undefined {
    return WorkspacePath;
}
export function GetTerminalName(): string {
    return TerminalName;
}
export function GetTestCoverageCommand(coverageFilesStr: string, testFilesStr: string): string {
    return `npm test ${coverageFilesStr} -- --coverage --collectCoverageFrom='${testFilesStr}'`;
}
export function GetCoverageFolderPath(coverageJsonFilePath: string): string {
    const match = coverageJsonFilePath.match(/^(.*\/).*coverage-final\.json$/);
    if (match && match[1] && WorkspacePath) {
        const coverageFolderPath = Helper.convertPathToUnix(WorkspacePath + match[1]);
        return coverageFolderPath;
    }
    return "";
} 