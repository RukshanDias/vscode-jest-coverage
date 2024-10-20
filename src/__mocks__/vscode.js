const { env } = require("process");

module.exports = {
   window : {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),

    showTextDocument: jest.fn(),
    activeTextEditor: {
      document: {
        uri: {
          fsPath: 'd:\\Jest_Demo\\src\\activeFile.js'
        }
      }
    },
  },

  workspace: {
    getConfiguration: jest.fn(),
    openTextDocument: jest.fn(),
    workspaceFolders: [
      {
        uri: { fsPath: 'd:\\Jest_Demo' },
        name: 'workspace1',
        index: 0
      }
    ],
  },
  
   commands : {
    executeCommand: jest.fn(),
  },
  
  Uri: {
    file: jest.fn(),
  },

  env: {
    openExternal: jest.fn(),
  },
} 