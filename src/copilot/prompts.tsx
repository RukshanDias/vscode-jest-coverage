import {
	AssistantMessage,
	BasePromptElementProps,
	PromptElement,
	PromptSizing,
	UserMessage,
} from '@vscode/prompt-tsx';
import { MethodDetails } from '../commands/codeAnalyzer';

const ANNOTATION_PROMPT = `For the selected code lines write unit tests that cover its method paths. Use only Jest for writing unit tests.
Rules To FOllow STRICTLY:
1. Write unit tests for the selected code lines & Method.
1.1 Give only the code no explaination or anyother text. SHould be like 'it.('predicate here',()=>{test logic here})'
2. Use Jest for writing unit tests.
3. Write unit tests that cover all method paths.
4. Mock all services called in the method using jest.spyOn().
5. If there're multiple test cases, wrappe them in a describe block with method name as name.`;


export interface PromptProps extends BasePromptElementProps {
	userQuery: string;
    methodDetails: MethodDetails | undefined;
    testFileData: string;
}

export interface PromptState {
	creationScript: string;
}

export class Prompt extends PromptElement<PromptProps, PromptState> {
	// override async prepare() {}

	async render(state: PromptState, sizing: PromptSizing) {
		return (
			<>
				<AssistantMessage>
					{ANNOTATION_PROMPT}
					{this.getMethodPrompt(this.props.methodDetails)}
                    {"this is the test file written already use this as a sample: \n" +this.props.testFileData}
                    
				</AssistantMessage>

				<UserMessage>
					{this.props.userQuery}
				</UserMessage>
			</>
		);
	}

    private getMethodPrompt(methodDetails: MethodDetails|undefined): string {
        if (!methodDetails) {
            return "No method details found";
        }
        const json = {
            "method name": methodDetails.name,
            "method parameters and types": methodDetails.parameters,
            "method return type": methodDetails.returnType,
            "startLine": methodDetails.startLine,
            "endLine": methodDetails.endLine,
            "accessModifier": methodDetails.accessModifier
        }
        return JSON.stringify(json);
    }
}