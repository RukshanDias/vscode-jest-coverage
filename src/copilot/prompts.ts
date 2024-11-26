import { MethodDetails } from '../commands/codeAnalyzer';

export const ANNOTATION_PROMPT = `For the selected code lines write unit tests that cover its method paths. Use only Jest for writing unit tests.
Rules To FOllow STRICTLY:
1. Write unit tests for the selected code lines & Method.
1.1 Give only the code no explaination or anyother text. SHould be like 'it.('predicate here',()=>{test logic here})'
2. Use Jest for writing unit tests.
3. Write unit tests that cover all method paths.
4. Mock all services called in the method using jest.spyOn().`;

export function getMethodPrompt(methodDetails: MethodDetails|undefined): string {
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