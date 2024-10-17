/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  rootDir: "./src",
  moduleNameMapper: {
    // "^vscode$": "jest-mock-vscode"
    '^vscode$': '<rootDir>/__mocks__/vscode.js'
  }
};