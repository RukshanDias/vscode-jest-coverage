import * as vscode from "vscode";
import { FileMethodSelector, SelectionRange } from "./service/fileMethodSelector.service";
import { CoverageGenerator } from "./service/coverageGenerator.service";
import { Helper } from "./helper/helper";
import { Logger } from "./helper/logger";
import { CodelensProvider } from "./commands/codeLensProvider";
import { GetCoverageFolderPath } from "./config";
import { Copilot } from "./service/copilot.service";
import { getMethodPrompt, ANNOTATION_PROMPT } from "./copilot/prompts";
import { CodeAnalyzer } from "./commands/codeAnalyzer";
import path from "path";

export function activate(context: vscode.ExtensionContext) {
    let fileMethodSelector = new FileMethodSelector();
    let coverageGenerator = new CoverageGenerator();
    const codeAnalyzer = new CodeAnalyzer();
    const copilot = new Copilot();

    // Register the command for file/s selection
    let disposableFileSelection = vscode.commands.registerCommand("jest-coverage.getFilePath", (uris: vscode.Uri[]) => {
        Logger.debug("coverage from file command triggered.");
        if (!Helper.haveTestFileFormat(uris)) {
            vscode.window.showInformationMessage("Pls select your test file!");
            Logger.debug("Invalid file selected.", uris);
            return;
        }

        Helper.clearPreviousData(fileMethodSelector, coverageGenerator);

        if (uris.length === 1) {
            fileMethodSelector.setCoverageType("SingleFile");
        } else {
            fileMethodSelector.setCoverageType("MultiFile");
        }

        fileMethodSelector.captureTestFilePaths(uris);
        fileMethodSelector.captureFixFilePaths();
        const testFiles = fileMethodSelector.getTestFilePaths();
        const fixFiles = fileMethodSelector.getFixFilePaths();
        if (testFiles && fixFiles) {
            coverageGenerator.generateCoverage(testFiles, fixFiles);
        }
    });

    // Register the command for code selection
    let disposableMethodSelection = vscode.commands.registerCommand(
        "jest-coverage.method",
        async (uri: vscode.Uri, lastSelectionRange?: SelectionRange) => {
            if (Helper.haveTestFileFormat([uri])) {
                vscode.window.showInformationMessage("Pls select your production file!");
                Logger.debug("Invalid file selected.", uri);
                return;
            }
            Helper.clearPreviousData(fileMethodSelector, coverageGenerator);

            fileMethodSelector.setCoverageType("CodeSelection");
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                if (lastSelectionRange) {
                    fileMethodSelector.setSelectionRange(lastSelectionRange);
                } else {
                    fileMethodSelector.captureSelectionRange(editor);
                    codelensProvider.setVisibility(false);
                }
                fileMethodSelector.captureTestFileFromFixFile(editor.document.uri);
                fileMethodSelector.captureFixFilePaths();

                let testFiles = fileMethodSelector.getTestFilePaths();
                let fixFiles = fileMethodSelector.getFixFilePaths();
                let selection = fileMethodSelector.getSelectionRange();
                if (testFiles && fixFiles) {
                    await coverageGenerator.generateCoverage(testFiles, fixFiles, selection);
                    codelensProvider.setVisibility(true);
                    Helper.removeSelection(editor);
                }
            } else {
                vscode.window.showErrorMessage("No file is opened.");
            }
        }
    );

    context.subscriptions.push(disposableFileSelection);
    context.subscriptions.push(disposableMethodSelection);

    // ---------------------- Declaring CodeLens Provider & commands ---------------
    const codelensProvider = new CodelensProvider(fileMethodSelector);
    vscode.languages.registerCodeLensProvider("*", codelensProvider);

    vscode.commands.registerCommand("jest-coverage.codelens.clear", () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            console.log("clear");
            codelensProvider.setVisibility(false);
            coverageGenerator.removeCoverageInfoDecorations(editor.document.uri.fsPath);
            coverageGenerator.removeTopLineDecorations();

            vscode.commands.executeCommand("workbench.action.closeActiveEditor");
            Helper.openFileInVscode(editor.document.uri.fsPath);
        }
    });

    vscode.commands.registerCommand("jest-coverage.codelens.browserView", () => {
        const coverageJsonFilePath = vscode.workspace.getConfiguration("JestCoverage").get<string>("coverageJsonFilePath", "");

        let coverageFolderPath = GetCoverageFolderPath(coverageJsonFilePath);
        if (coverageFolderPath !== "") {
            vscode.env.openExternal(vscode.Uri.file(coverageFolderPath + "lcov-report/index.html"));
        }
    });

    vscode.commands.registerCommand("jest-coverage.codelens.rerun", (selectionRange: SelectionRange, uri: any) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            vscode.commands.executeCommand("jest-coverage.method", editor.document.uri, selectionRange);
        }
    });

    vscode.commands.registerCommand("jest-coverage.codelens.copilot", (selectionRange: SelectionRange, uri: any) => {
        const editor = vscode.window.activeTextEditor;
        const testFiles = fileMethodSelector.getTestFilePaths();
        const testFile = testFiles ? testFiles[0] : "";

        // expected:
        /*
         *1. Fix file= selected function name, line num, public/private, params, returns, services called, tree structure of method
         *2. Test file= name of the test file, is test file created?, already tests written for func?, line to write(default last line)
         *3. Coverage Data= which parts has not been covered?
         *4. recipe prompt= instructions
         **/
        if (editor) {
            vscode.commands.executeCommand("jest-coverage.copilot", editor, testFile, selectionRange);
        }
    });

    // -----------------------------Copilot---------------------------------------
    const disposableCopilot = vscode.commands.registerCommand("jest-coverage.copilot", async (textEditor: vscode.TextEditor, testFile: string, selectionRange: SelectionRange) => {
        // execute below
        //   const releventMethodsPrompt = getRelventMethodsPrompt(textEditor);
        //   const testFilePrompt = testFile ? getTextFileData(testFile) : "no test file created";
        //   const coverageData = getCoverageData(testFile);
        // correct line to add generated tests

        // get the method details
        const methodDetails = codeAnalyzer.getMethodDetailsInRange(selectionRange.filePath, selectionRange.start, selectionRange.end);
        const testFileData = codeAnalyzer.getTestDetails(testFile);


        // select the 4o chat model
        let [model] = await vscode.lm.selectChatModels({
            vendor: "copilot",
            family: "gpt-4o",
        });

        // init the chat message
        const messages = [
            vscode.LanguageModelChatMessage.User(getMethodPrompt(methodDetails)),
            vscode.LanguageModelChatMessage.User("this is the test file written already use this as a sample: \n" + testFileData),
            vscode.LanguageModelChatMessage.User(ANNOTATION_PROMPT),
            // vscode.LanguageModelChatMessage.User(codeWithLineNumbers)
        ];

        // make sure the model is available
        if (model) {
            // send the messages array to the model and get the response
            let chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

            // display as message
            // let allFragments = [];
            // for await (const fragment of chatResponse.text) {
            //     allFragments.push(fragment);
            // }
            // vscode.window.showInformationMessage(allFragments.join(""));

            const testEditor = await Helper.openFileInVscode(testFile);
            
            if (testEditor) {
                // display as file text
                for await (const fragment of chatResponse.text) {
                    await testEditor.edit(edit => {
                        const lastLine = testEditor.document.lineAt(testEditor.document.lineCount - 1);
                        const position = new vscode.Position(lastLine.lineNumber, lastLine.text.length);
                        edit.insert(position, fragment);
                    });
                }
            }
        }
    });

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
            let coverageInfoDecoHist = coverageGenerator.getCoverageInfoDecorationMap().get(filePath);
            if (coverageInfoDecoHist) {
                editor.setDecorations(coverageInfoDecoHist.decorationType, coverageInfoDecoHist.decorations);
            }

            let topLineDecoHist = coverageGenerator.getTopLineDecorationMap().get(filePath);
            if (topLineDecoHist) {
                editor.setDecorations(topLineDecoHist.decorationType, topLineDecoHist.decorations);
            }
        }
    }

    function handleTextDocumentClosed(document: vscode.TextDocument) {
        const filePath = document.uri.fsPath;
        let coverageInfoDecoHist = coverageGenerator.getCoverageInfoDecorationMap().get(filePath);
        if (coverageInfoDecoHist) {
            coverageGenerator.removeCoverageInfoDecorations(filePath);
        }

        let topLineDecoHist = coverageGenerator.getTopLineDecorationMap().get(filePath);
        // If topLineDeco exists then clear decoration & hide codelens
        if (topLineDecoHist) {
            coverageGenerator.removeTopLineDecorations();
            codelensProvider.setVisibility(false);
        }
    }

    context.subscriptions.push(disposableContextMenu);
    context.subscriptions.push(disposableSCM);
}

export function deactivate() {}
