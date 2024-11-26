
import * as vscode from 'vscode';
import { FileMethodSelector } from './fileMethodSelector.service';
import { ANNOTATION_PROMPT, getMethodPrompt } from '../copilot/prompts';
import { CodeAnalyzer } from '../commands/codeAnalyzer';

export class Copilot {
  private fileMethodSelector: FileMethodSelector;
  private codeAnalyzer: CodeAnalyzer;

  constructor(fileMethodSelector: FileMethodSelector,codeAnalyzer: CodeAnalyzer) {
    this.fileMethodSelector = fileMethodSelector;
    this.codeAnalyzer = codeAnalyzer;
  }

  public async listenChatParticipant( request: vscode.ChatRequest, context: vscode.ChatContext, response: vscode.ChatResponseStream, token: vscode.CancellationToken) {
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



    const userQuery = request.prompt;
    response.progress("Processing your request...");

    // get the method details
    const methodDetails = this.codeAnalyzer.getMethodDetailsInRange(selectionRange.filePath, selectionRange.start, selectionRange.end);
    const testFileData = this.codeAnalyzer.getTestDetails(testFile);


    // select the 4o chat model
    let [model] = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "gpt-4o",
    });

    // init the chat message
    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(getMethodPrompt(methodDetails)),
      vscode.LanguageModelChatMessage.User("this is the test file written already use this as a sample: \n" + testFileData),
      vscode.LanguageModelChatMessage.User(ANNOTATION_PROMPT),
      // vscode.LanguageModelChatMessage.User(codeWithLineNumbers)
    ];

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
        response.button({ title: "Add to test file", command: "jest-coverage.chat-button", arguments: [match[1], testFile] });
      }
    }
  }


}

