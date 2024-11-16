import { Project, MethodDeclaration, FunctionDeclaration, ParameterDeclaration, Node, SyntaxKind } from "ts-morph";

// Interface to represent method details
export interface MethodDetails {
  name: string;
  parameters: { name: string; type: string }[];
  returnType: string;
  startLine: number;
  endLine: number;
  accessModifier: string;
  isStatic: boolean;
}

export class CodeAnalyzer {
  private project: Project;

  constructor() {
    this.project = new Project();
  }

  /**
   * Get detailed information about the method in the specified line range.
   * @param filePath - The path to the TypeScript file.
   * @param startLine - The starting line number (1-based).
   * @param endLine - The ending line number (1-based).
   * @returns MethodDetails if found, otherwise undefined.
   */
  public getMethodDetailsInRange(filePath: string, startLine: number, endLine: number): MethodDetails | undefined {
    const sourceFile = this.project.addSourceFileAtPath(filePath);

    // Get all functions and methods in the file
    const functionsAndMethods = sourceFile.getFunctions();

    for (const method of functionsAndMethods) {
      const methodStart = method.getStartLineNumber();
      const methodEnd = method.getEndLineNumber();

      // Check if the method falls within the specified line range
      if (methodStart >= startLine && methodEnd <= endLine) {
        return this.extractMethodDetails(method);
      }
    }

    return undefined;
  }

  public getTestDetails(filePath:string):string{
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    const testDetails = sourceFile.getFullText();
    return testDetails;
  }

  /**
   * Extract detailed information from a function or method node.
   * @param node - The function or method node.
   * @returns MethodDetails object.
   */
  private extractMethodDetails(
    node: FunctionDeclaration | MethodDeclaration
  ): MethodDetails {
    const name = node.getName() || "Anonymous Function";

    // Extract parameters
    const parameters = node.getParameters().map((param: ParameterDeclaration) => ({
      name: param.getName(),
      type: param.getType().getText(),
    }));

    // Extract return type
    // const returnType = node.getReturnType().getText();
    const returnType = "void"; // Default to void if no return type

    // Extract access modifier (public, private, protected)
    // const accessModifier = Node.isMethodDeclaration(node)
    //   ? node.getVisibility() || "public"
    //   : "public"; // Default to public for standalone functions

      // Extract access modifier (public, private, protected)
      let accessModifier = "public"; // Default to public for standalone functions

      if (Node.isMethodDeclaration(node)) {
          const modifiers = node.getModifiers().map(modifier => modifier.getText());
          if (modifiers.includes("private")) {
              accessModifier = "private";
          } else if (modifiers.includes("protected")) {
              accessModifier = "protected";
          }
      }

    // Check if the method is static
    const isStatic = Node.isMethodDeclaration(node) ? node.isStatic() : false;

    // Get start and end line numbers
    const startLine = node.getStartLineNumber();
    const endLine = node.getEndLineNumber();

    return {
      name,
      parameters,
      returnType,
      startLine,
      endLine,
      accessModifier,
      isStatic,
    };
  }
}

// Example usage
// const analyzer = new CodeAnalyzer();
// const filePath = "path/to/your/file.ts";
// const startLine = 10;
// const endLine = 20;

// const methodDetails = analyzer.getMethodDetailsInRange(filePath, startLine, endLine);

// if (methodDetails) {
//   console.log("Method Details:", methodDetails);
// } else {
//   console.log("No method found in the specified range.");
// }
