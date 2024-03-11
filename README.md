# Jest Quick Coverage

## Overview

The Jest Quick Coverage is a Visual Studio Code extension designed to streamline the process of generating and capturing test coverage for JavaScript related projects that use Jest as their testing framework. This extension allows developers to select specific test file/s and generate coverage reports, highlighting uncovered lines directly within the VS Code editor for convenient reference and modification.

## Features

-   **Selective Coverage**: Easily generate test coverage reports for selected file or files using Jest.
-   **Visual Feedback**: Uncovered lines are marked within the VS Code editor for quick identification and remediation.
-   **Streamlined Workflow**: Simplifies the process of analyzing and improving test coverage within your project.

## Usage

1. In settings setup the test file format you're using.
2. Select the desired file or multiple files in the Explorer sidebar.
3. Right-click on the selection and choose the "Get Coverage" option from the context menu.
4. The extension will trigger Jest to generate the coverage report and mark uncovered lines within the editor.

## Requirements

-   Visual Studio Code
-   Jest installed and configured in your project

## Extension Settings

-   Option to setup the test file format. Default is .spec.ts.
-   Coverage view option, inline in vscode or in browser.

## Known Issues

There are no known issues with the current version of the extension. If you encounter any problems or have suggestions for improvement, please [submit an issue](https://github.com/RukshanDias/vscode-jest-coverage/issues) on GitHub.

## License

This extension is licensed under the [MIT License](LICENSE).

---

Thank you for using the Jest Quick Coverage extension! We hope it enhances your testing workflow and helps you achieve better coverage in your projects. If you find it helpful, consider leaving a review or star.
