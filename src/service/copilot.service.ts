	
import * as vscode from 'vscode';

export class Copilot {
    public async retrieveModels() {
        // Retrieving all models
        const models = await vscode.lm.selectChatModels();
      
        // Retrieving a specific model
        const [model] = await vscode.lm.selectChatModels({
          vendor: "copilot",
          family: ""
        });
      
        return { models, model };
    }
      
    public setMessage(title: string) {
        const messages = [
            vscode.LanguageModelChatMessage.User(`For an article created with Front Matter CMS, create me a SEO friendly description that is a maximum of 160 characters long.`),
            vscode.LanguageModelChatMessage.User(`Desired format: just a string, e.g., "My first blog post".`),
            vscode.LanguageModelChatMessage.User(`The article topic is """${title}"""`),
          ];
    }

}

