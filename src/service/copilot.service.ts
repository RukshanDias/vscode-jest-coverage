
import * as vscode from 'vscode';
import { FileMethodSelector } from './fileMethodSelector.service';
import { Prompt } from '../copilot/prompts';
import { CodeAnalyzer } from '../commands/codeAnalyzer';
import { renderPrompt } from '@vscode/prompt-tsx';

export class Copilot {
  private fileMethodSelector: FileMethodSelector;
  private codeAnalyzer: CodeAnalyzer;

  constructor(fileMethodSelector: FileMethodSelector, codeAnalyzer: CodeAnalyzer) {
    this.fileMethodSelector = fileMethodSelector;
    this.codeAnalyzer = codeAnalyzer;
  }

  // expected:
  /*
   *1. Fix file= selected function name, line num, public/private, params, returns, services called, tree structure of method
   *2. Test file= name of the test file, is test file created?, already tests written for func?, line to write(default last line)
   *3. Coverage Data= which parts has not been covered?
   *4. recipe prompt= instructions
   *5. code version control= newly added code lines. use this to generate tests
   *6. on user input with @Jest-Coverage-Chat Modify generated tests.
   *7. **Override Jest Coverage report settings. to trace method calls & more data
   **/

  public async listenChatParticipant(request: vscode.ChatRequest, context: vscode.ChatContext, response: vscode.ChatResponseStream, token: vscode.CancellationToken) {
    const selectionRange = this.fileMethodSelector.getSelectionRange();
    const fixFiles = this.fileMethodSelector.getFixFilePaths();
    const fixFile = fixFiles ? fixFiles[0] : "";
    const testFiles = this.fileMethodSelector.getTestFilePaths();
    const testFile = testFiles ? testFiles[0] : "";

    if (!selectionRange || !testFile || !fixFile) {
      return;
    }


    this.codeAnalyzer.getUncommittedChanges(fixFile).then((diff) => {
      if (diff) {
        console.log("Uncommitted changes:\n", diff);
      } else {
        console.log("No uncommitted changes.");
      }
    });


    response.progress("Processing your request...");

    // get the method details
    const methodDetails = this.codeAnalyzer.getMethodDetailsInRange(selectionRange.filePath, selectionRange.start, selectionRange.end);
    const testFileData = this.codeAnalyzer.getTestDetails(testFile);


    // select the 4o chat model
    let [model] = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "gpt-4o",
    });

    // Render TSX prompt
    const { messages } = await renderPrompt(
      Prompt,
      { userQuery: request.prompt, methodDetails: methodDetails, testFileData: testFileData },
      { modelMaxPromptTokens: model?.maxInputTokens},
      model
    );


    if (model) {
      const chatRequest = await model.sendRequest(messages, {}, token);

      let data = "";
      for await (const fragment of chatRequest.text) {
        response.markdown(fragment);
        data += fragment;
      }

      const regex = /```[^\n]*\n([\s\S]*?)\n```/g;
      const match = regex.exec(data);
      if (match && match[1]) {
        response.button({
          title: vscode.l10n.t("Add to test file"),
          command: "jest-coverage.chat-button",
          arguments: [match[1], testFile]
        });
      }
    }
  }


}

