import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Helper } from '../helper/helper';
import { error } from 'console';
import { FileMethodSelector } from '../service/fileMethodSelector.service';
import { CoverageGenerator } from '../service/coverageGenerator.service';

jest.mock('fs');
jest.mock('path');

describe('Helper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('convertPathToRelative', () => {
        it('should convert paths to relative paths', () => {
            const paths = ['d:\\Jest_Demo\\src\\file1.test.js', 'd:\\Jest_Demo\\src\\file2.test.js'];
            const relativePaths = ['src\\file1.test.js', 'src\\file2.test.js'];
            (path.relative as jest.Mock).mockImplementation((from, to) => to.replace(from + '\\', ''));

            const result = Helper.convertPathToRelative(paths);
            expect(result).toEqual(relativePaths);
        });
    });

    describe('isFileAvailable', () => {
        it('should return true if file exists', () => {
            const filePath = 'path/to/file.ts';
            (fs.accessSync as jest.Mock).mockImplementation(() => { return true; });

            const result = Helper.isFileAvailable(filePath);
            expect(result).toBe(true);
        });

        it('should return false if file does not exist', () => {
            const filePath = 'path/to/file.ts';
            (fs.accessSync as jest.Mock).mockImplementation(() => { throw new Error(); });

            const result = Helper.isFileAvailable(filePath);
            expect(result).toBe(false);
        });
    });

    describe('convertPathToUnix', () => {
        it('should convert Windows path to Unix path', () => {
            const windowsPath = 'path\\to\\file.ts';
            const unixPath = 'path/to/file.ts';

            const result = Helper.convertPathToUnix(windowsPath);
            expect(result).toBe(unixPath);
        });

        it('should return Unix path unchanged', () => {
            const unixPath = 'path/to/file.ts';

            const result = Helper.convertPathToUnix(unixPath);
            expect(result).toBe(unixPath);
        });
    });
    describe('deleteFile', () => {
        it('should resolve when file is deleted successfully', async () => {
            const filePath = 'path/to/file.ts';

            (fs.unlink as unknown as jest.Mock).mockImplementation((path, callback) => callback(null));

            await expect(Helper.deleteFile(filePath)).resolves.toBeUndefined();
        });

        it('should reject with error when unlink fails with an error other than ENOENT', async () => {
            const filePath = 'path/to/file.ts';
            const error = { code: 'EACCES' };

            (fs.unlink as unknown as jest.Mock).mockImplementation((path, callback) => callback(error));

            await expect(Helper.deleteFile(filePath)).rejects.toEqual(error);
        });

        it('should show information message when file does not exist (ENOENT)', async () => {
            const filePath = 'path/to/file.ts';
            const error = { code: 'ENOENT' };

            (fs.unlink as unknown as jest.Mock).mockImplementation((path, callback) => callback(error));
            let spy = jest.spyOn(vscode.window, 'showErrorMessage');

            await expect(Helper.deleteFile(filePath)).rejects.toEqual(error);

            expect(spy).toHaveBeenCalledWith("No coverage file found.\nPls select the correct file in settings.");
        });
    });
    
    describe('openFileInVscode', () => {
        it('should open file in VS Code', async () => {
            const filePath = 'path/to/file.ts';
            const mockUri = { fsPath: filePath } as vscode.Uri;
            const mockDocument = { uri: mockUri } as vscode.TextDocument;

            (vscode.Uri.file as jest.Mock).mockReturnValue(mockUri);
            (vscode.workspace.openTextDocument as jest.Mock).mockReturnValue(mockDocument);
            (vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});

            await Helper.openFileInVscode(filePath);

            expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument, { preview: false });
        });

        it('should log error if opening file fails', async () => {
            const filePath = 'path/to/file.ts';
            const error = new Error('Failed to open file');

            (vscode.Uri.file as jest.Mock).mockReturnValue({ fsPath: filePath } as vscode.Uri);
            (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(error);
            const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

            await Helper.openFileInVscode(filePath);

            expect(consoleErrorMock).toHaveBeenCalledWith("Error:", error);
        });
    });

    describe('haveTestFileFormat', () => {
        it('should return true if all files have the test file format', () => {
            const files = [
                { path: '/path/to/file1.spec.ts' },
                { path: '/path/to/file2.spec.ts' }
            ] as vscode.Uri[];

            jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
                get: jest.fn().mockReturnValue('.spec.ts')
            } as any);

            const result = Helper.haveTestFileFormat(files);
            expect(result).toBe(true);
        });

        it('should return false if any file does not have the test file format', () => {
            const files = [
                { path: '/path/to/file1.spec.ts' },
                { path: '/path/to/file2.ts' }
            ] as vscode.Uri[];

            jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
                get: jest.fn().mockReturnValue('.spec.ts')
            } as any);

            const result = Helper.haveTestFileFormat(files);
            expect(result).toBe(false);
        });
    });

    describe('clearPreviousData', () => {
        let fileMethodSelector: FileMethodSelector;
        let coverageGenerator: CoverageGenerator;

        beforeEach(() => {
            fileMethodSelector = new FileMethodSelector();
            coverageGenerator = new CoverageGenerator();

            jest.spyOn(fileMethodSelector, 'clear').mockImplementation(() => {});
            jest.spyOn(coverageGenerator, 'getCoverageInfoDecorationMap').mockReturnValue(new Map());
            jest.spyOn(coverageGenerator, 'removeCoverageInfoDecorations').mockImplementation(() => {});
            jest.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);
            jest.spyOn(Helper, 'openFileInVscode').mockResolvedValue(undefined);
        });

        it('should dispose of terminals named "Jest Coverage"', () => {
            const disposeMock = jest.fn();
            (vscode.window.terminals as any) = [
                { name: 'Jest Coverage', dispose: disposeMock },
                { name: 'Other Terminal', dispose: jest.fn() }
            ];

            Helper.clearPreviousData(fileMethodSelector, coverageGenerator);

            expect(disposeMock).toHaveBeenCalled();
        });

        it('should clear fileMethodSelector', () => {
            Helper.clearPreviousData(fileMethodSelector, coverageGenerator);

            expect(fileMethodSelector.clear).toHaveBeenCalled();
        });

        it('should remove coverage info decorations if present', () => {
            const coverageInfoDecorationMap = new Map([['key', 'value']]);
            (coverageGenerator.getCoverageInfoDecorationMap as jest.Mock).mockReturnValue(coverageInfoDecorationMap);

            Helper.clearPreviousData(fileMethodSelector, coverageGenerator);

            expect(coverageGenerator.removeCoverageInfoDecorations).toHaveBeenCalled();
        });

        it('should close active editor and open file in VS Code if editor is present', () => {
            const coverageInfoDecorationMap = new Map([['key', 'value']]);
            (coverageGenerator.getCoverageInfoDecorationMap as jest.Mock).mockReturnValue(coverageInfoDecorationMap);
            Helper.clearPreviousData(fileMethodSelector, coverageGenerator);

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith("workbench.action.closeActiveEditor");
            expect(Helper.openFileInVscode).toHaveBeenCalledWith('d:\\Jest_Demo\\src\\activeFile.js');
        });
    });
});