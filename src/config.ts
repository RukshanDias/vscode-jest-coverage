import * as vscode from 'vscode';

const LOG_LEVEL = "debug";
const WorkspacePath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;


export function GetLogLevel(): string {
    return LOG_LEVEL;
}
export function GetworkspacePath(): string|undefined {
    return WorkspacePath;
}
export function GetTestCoverageCommand(coverageFilesStr: string, testFilesStr: string): string {
    return `npm test ${coverageFilesStr} -- --coverage --collectCoverageFrom='${testFilesStr}'`;
}
export function GetCoverageFolderPath(coverageJsonFilePath: string): string {
    const match = coverageJsonFilePath.match(/^(.*\/).*coverage-final\.json$/);
    if (match && match[1] && WorkspacePath) {
        return WorkspacePath + match[1];
    }
    return "";
} 