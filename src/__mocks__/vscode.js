const { env } = require("process");

module.exports = {
   window : {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(),
    workspaceFolders: [
      {
        uri: { fsPath: 'root/path-of-file' },
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