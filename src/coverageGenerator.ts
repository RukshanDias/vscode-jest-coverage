import { Helper } from "./helper";

export class CoverageGenerator {
    public static generateCoverage(filePaths: string[], testFilePaths: string[]): void {
        filePaths = Helper.convertPathToRelative(filePaths);
        testFilePaths = Helper.convertPathToRelative(testFilePaths);

        let command = this.generateCommand(filePaths, testFilePaths);
        Helper.executeCommandInTerminal(command);
    }

    private static generateCommand(filePaths: string[], testFilePaths: string[]): string {
        const testFilesStr = JSON.stringify(testFilePaths);
        const coverageFilesStr = filePaths.join(" ");

        let command = `npm test ${coverageFilesStr} -- --coverage --collectCoverageFrom='${testFilesStr}'`;
        return Helper.convertPathToUnix(command);
    }
}
