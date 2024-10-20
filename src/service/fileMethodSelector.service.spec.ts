import { FileMethodSelector } from "./fileMethodSelector.service";
import * as vscode from 'vscode'; 
import { Helper } from '../helper/helper';  

describe('FileSelector', () => {
    let component: FileMethodSelector;
    let mockHelper = Helper;

    beforeEach(() => {
        component = new FileMethodSelector();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

  describe('captureTestFilePaths', () => {
    it('should capture test file paths & add to testFilePaths', () => {
      let mockUris: Partial<vscode.Uri>[] = [
        { fsPath: 'root/path1/file.ts', scheme: 'file' }
        , { fsPath: 'root/path2/file.ts', scheme: 'file' }
      ];
      const expected = ['root/path1/file.ts', 'root/path2/file.ts'];

      component.captureTestFilePaths(mockUris as vscode.Uri[]);
      const captured = component.getTestFilePaths();
      expect(captured).toEqual(expected);
    });

    it('should return undefiend if file paths scheme is not file', () => {
      let mockUris: Partial<vscode.Uri>[] = [
        { fsPath: 'root/path1/file.ts', scheme: 'not-file' }
        , { fsPath: 'root/path2/file.ts', scheme: 'file' }
      ];

      component.captureTestFilePaths(mockUris as vscode.Uri[]);
      const captured = component.getTestFilePaths();
      expect(captured).toBeUndefined();
    });

    it('should return error popup if file paths scheme is not file', () => {
      let mockUris: Partial<vscode.Uri>[] = [
        { fsPath: 'root/path1/file.ts', scheme: 'not-file' }
        , { fsPath: 'root/path2/file.ts', scheme: 'file' }
      ];
      let spy = jest.spyOn(vscode.window, 'showErrorMessage');

      component.captureTestFilePaths(mockUris as vscode.Uri[]);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('captureSelectionRange', () => {
    it('should capture selection range', () => {
        const mockEditor = {
            selection: {
                start: { line: 4 },
                end: { line: 8 }
            },
            document: {
                uri: { fsPath: '/path/to/file.ts' }
            }
        } as unknown as vscode.TextEditor;

        const expectedRange = {
            filePath: '/path/to/file.ts',
            start: 5,
            end: 9
        };

        component.captureSelectionRange(mockEditor);
        expect(component.getSelectionRange()).toEqual(expectedRange);
    });

    it('should handle empty selection', () => {
        const mockEditor = {
            selection: {
                start: { line: 0 },
                end: { line: 0 }
            },
            document: {
                uri: { fsPath: '/path/to/file.ts' }
            }
        } as unknown as vscode.TextEditor;

        const expectedRange = {
            filePath: '/path/to/file.ts',
            start: 1,
            end: 1
        };

        component.captureSelectionRange(mockEditor);
        expect(component.getSelectionRange()).toEqual(expectedRange);
    });
});

  describe('captureFixFilePaths', () => {
    let testFilePaths: string[];

    beforeEach(() => {
      testFilePaths = ['root/path1/file.spec.ts', 'root/path2/file.spec.ts'];
      component['testFilePaths'] = testFilePaths;
      jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
        get: jest.fn().mockReturnValue('.spec.ts')
      } as any);
    });

    it('should capture fix file paths', () => {
      jest.spyOn(mockHelper, 'isFileAvailable').mockReturnValue(true);
      let expected = ['root/path1/file.ts', 'root/path2/file.ts'];
      component.captureFixFilePaths();

      expect(component.getFixFilePaths()).toEqual(expected);
    });

    it('should show error message if fix file path is not available', () => {
      jest.spyOn(mockHelper, 'isFileAvailable').mockReturnValue(false);
      const spy = jest.spyOn(vscode.window, 'showErrorMessage');

      component.captureFixFilePaths();
      expect(spy).toHaveBeenCalledWith("Couldn't find the relevant production file");
    });

    it('should clear properties if fix file path is not available', () => {
      jest.spyOn(mockHelper, 'isFileAvailable').mockReturnValue(false);
      component.captureFixFilePaths();

      expect(component.getTestFilePaths()).toBeUndefined();
      expect(component.getFixFilePaths()).toBeUndefined();
      expect(component.getSelectionRange()).toBeUndefined();
      expect(component.getType()).toBeUndefined();
    });
  });

});