import * as vscode from 'vscode';
import { Helper } from '../helper/helper';
import { CoverageGenerator } from "./coverageGenerator.service";

jest.mock('../helper/helper');

describe('CoverageGenerator', () => {
    let component: CoverageGenerator;

    beforeEach(() => {
        component = new CoverageGenerator();

        jest.spyOn(vscode.window, 'showErrorMessage').mockImplementation(jest.fn());

        jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
            get: jest.fn().mockImplementation((key: string) => {
                switch (key) {
                    case 'coverageJsonFilePath':
                        return '/coverage/jest/coverage-final.json';
                    case 'coverageViewOption':
                        return 'View coverage report in browser';
                    default:
                        return '';
                }
            })
        } as any);

        // Mock Helper methods
        jest.spyOn(Helper, 'convertPathToRelative').mockImplementation((paths: string[]) => paths.map(path => `relative/${path}`));
        jest.spyOn(Helper, 'generateCoverageReport').mockResolvedValue(undefined);
        jest.spyOn(Helper, 'isFileAvailable').mockReturnValue(true);
        jest.spyOn(Helper, 'convertPathToUnix').mockImplementation(path => path.replace(/\\/g, '/'));

    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('generateCoverage', () => {
        let testFilePaths: string[];
        let fixFilePaths: string[];
        let selectionRange: { filePath: string, start: number, end: number };

        beforeEach(() => {
            jest.clearAllMocks();
            testFilePaths = ['test1.spec.ts', 'test2.spec.ts'];
            fixFilePaths = ['fix1.ts', 'fix2.ts'];
            selectionRange = { filePath: 'fix1.ts', start: 1, end: 10 };

            jest.spyOn(component as any, 'generateCommand').mockReturnValue('npm test --coverage');
            jest.spyOn(component as any, 'inlineCoverageView').mockImplementation(() => { });
            jest.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue({ title: 'View' });
        });

        it('should convert test file paths to relative paths', async () => {
            await component.generateCoverage(testFilePaths, fixFilePaths);
            expect(Helper.convertPathToRelative).toHaveBeenCalledWith(testFilePaths);
        });

        it('should convert fix file paths to relative paths', async () => {
            await component.generateCoverage(testFilePaths, fixFilePaths);
            expect(Helper.convertPathToRelative).toHaveBeenCalledWith(fixFilePaths);
        });

        it('should generate command with relative paths', async () => {
            await component.generateCoverage(testFilePaths, fixFilePaths);
            expect(component['generateCommand']).toHaveBeenCalledWith(['relative/test1.spec.ts', 'relative/test2.spec.ts'], ['relative/fix1.ts', 'relative/fix2.ts']);
        });

        it('should generate coverage report', async () => {
            await component.generateCoverage(testFilePaths, fixFilePaths);
            expect(Helper.generateCoverageReport).toHaveBeenCalledWith('npm test --coverage', 'd:/Jest_Demo/coverage/jest/coverage-final.json', ['relative/test1.spec.ts', 'relative/test2.spec.ts']);
        });

        it('should open coverage report in browser', async () => {
            await component.generateCoverage(testFilePaths, fixFilePaths);
            expect(vscode.env.openExternal).toHaveBeenCalledWith(vscode.Uri.file('relative/fix1.ts'));
        });

        describe('coverage for selection', () => {
            it('should call inlineCoverageView with selection range', async () => {
                await component.generateCoverage(testFilePaths, fixFilePaths, selectionRange);
                expect(component['inlineCoverageView']).toHaveBeenCalledWith('/coverage/jest/coverage-final.json', selectionRange);
            });

            it('should show information message', async () => {
                await component.generateCoverage(testFilePaths, fixFilePaths, selectionRange);
                let spy = jest.spyOn(vscode.window, 'showInformationMessage');
                expect(spy).toHaveBeenCalledWith("For better view, check coverage report", "View");
            });

            it('should set up the report file ready to display', async () => {
                jest.spyOn(vscode.Uri, 'file').mockImplementation((path: string) => path as any);
                
                await component.generateCoverage(testFilePaths, fixFilePaths, selectionRange);
                expect(vscode.Uri.file).toHaveBeenCalledWith('d:/Jest_Demo/coverage/jest/lcov-report/fix1.ts.html');
            });

            it('should set up the common report file ready to display is given file do not exsists', async () => {
                jest.spyOn(Helper, 'isFileAvailable').mockReturnValueOnce(false);
                jest.spyOn(vscode.Uri, 'file').mockImplementation((path: string) => path as any);
                
                await component.generateCoverage(testFilePaths, fixFilePaths, selectionRange);
                expect(vscode.Uri.file).toHaveBeenCalledWith('d:/Jest_Demo/coverage/jest/lcov-report/index.html');
            });
        });
    });
});