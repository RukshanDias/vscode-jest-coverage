import * as vscode from "vscode";
import { FileMethodSelector, workspacePath } from "./fileMethodSelector";
import { CoverageGenerator } from "./coverageGenerator";

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "jest-coverage" is now active!');

    let fileMethodSelector = new FileMethodSelector();
    let coverageGenerator = new CoverageGenerator();

    // Register the command for file/s selection
    let disposableFileSelection = vscode.commands.registerCommand("jest-coverage.getFilePath", (uris: vscode.Uri[]) => {
        if (uris.length == 1) {
            fileMethodSelector.setCoverageType("SingleFile");
        } else {
            fileMethodSelector.setCoverageType("MultiFile");
        }
        fileMethodSelector.getFilePath(uris);
        fileMethodSelector.captureTestFilePaths();
        let testFiles = fileMethodSelector.getTestFilePaths();
        let files = fileMethodSelector.getFilePaths();
        if (testFiles && files) {
            coverageGenerator.generateCoverage(testFiles, files);
        }
    });

    // Register the command for code selection
    let disposableMethodSelection = vscode.commands.registerCommand("jest-coverage.method", (uri: vscode.Uri) => {
        fileMethodSelector.setCoverageType("CodeSelection");
        fileMethodSelector.getFilePath([uri]);
        let filePaths = fileMethodSelector.getFilePaths();
        if (filePaths) {
            for (const filePath of filePaths) {
                vscode.window.showInformationMessage(filePath);
                console.log(filePath);
            }
        }
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            fileMethodSelector.captureSelectionRange(editor);
            let selection = fileMethodSelector.getSelectionRange();
            vscode.window.showInformationMessage(`Selected lines: ${selection?.start} to ${selection?.end}`);
        } else {
            vscode.window.showErrorMessage("No file is opened.");
        }
    });

    context.subscriptions.push(disposableFileSelection);
    context.subscriptions.push(disposableMethodSelection);

    // ----------------------------- Event Listeners ---------------------------------------
    // Event listener for context menu
    const disposableContextMenu = vscode.commands.registerCommand(
        "jest-coverage.contextMenuFilePathOption",
        (contextSelection: vscode.Uri, allSelections: vscode.Uri[]) => {
            vscode.commands.executeCommand("jest-coverage.getFilePath", allSelections);
        }
    );

    // Event listener for Source Control Panel
    const disposableSCM = vscode.commands.registerCommand("jest-coverage.sourceControlMenuFilePathOption", async (...file) => {
        const uris = file.map((item) => item.resourceUri);
        vscode.commands.executeCommand("jest-coverage.getFilePath", uris);
    });

    vscode.window.onDidChangeActiveTextEditor(handleActiveTextEditorChange, null, context.subscriptions);
    vscode.workspace.onDidCloseTextDocument(handleTextDocumentClosed, null, context.subscriptions);

    function handleActiveTextEditorChange(editor: vscode.TextEditor | undefined) {
        if (editor) {
            const filePath = editor.document.uri.fsPath;
            let hist = coverageGenerator.getDecorationsMap().get(filePath);
            if (hist) {
                editor.setDecorations(hist.decorationType, hist.decorations);
            }
        }
    }

    function handleTextDocumentClosed(document: vscode.TextDocument) {
        const filePath = document.uri.fsPath;
        let hist = coverageGenerator.getDecorationsMap().get(filePath);
        if (hist) {
            coverageGenerator.removeDecorations(filePath);
        }
    }

    context.subscriptions.push(disposableContextMenu);
    context.subscriptions.push(disposableSCM);
}

export function deactivate() {}
