import { SelectionRange } from "../service/fileMethodSelector.service";
import * as fs from "fs";

export class CoverageReportParser {
    private static instance: CoverageReportParser;

    public static getInstance(): CoverageReportParser {
        if (!this.instance) {
            this.instance = new CoverageReportParser();
        }
        return this.instance;
    }

    // Function to parse Jest coverage report
    public parseCoverageReport(filePath: string, selectionRange?: SelectionRange): Map<string, number[][]> {
        const report = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const coverageData = new Map<string, number[][]>();

        Object.keys(report).forEach((filename: string) => {
            const fileCoverage = report[filename];
            let coveredLines: number[][] = [];

            coveredLines = [...coveredLines, ...this.getStatementCoverage(fileCoverage, selectionRange)];
            coveredLines = [...coveredLines, ...this.getBranchCoverage(fileCoverage, selectionRange)];
            coveredLines = [...coveredLines, ...this.getFunctionCoverage(fileCoverage, selectionRange)];

            coverageData.set(filename, coveredLines);
        });

        return coverageData;
    }

    private getStatementCoverage(fileCoverage: any, selectionRange?: SelectionRange): number[][] {
        const coveredLines: number[][] = [];
        Object.keys(fileCoverage.statementMap).forEach((statementKey) => {
            const statementCoverage = fileCoverage.s[statementKey];
            if (statementCoverage !== undefined && statementCoverage === 0) {
                const line = fileCoverage.statementMap[statementKey];
                if (line) {
                    if (selectionRange && selectionRange.start <= line.start.line && selectionRange.end >= line.start.line) {
                        coveredLines.push(this.parseLineData(line, 1));
                    } else if (!selectionRange) {
                        coveredLines.push(this.parseLineData(line, 1));
                    }
                }
            }
        });
        return coveredLines;
    }

    private getBranchCoverage(fileCoverage: any, selectionRange?: SelectionRange): number[][] {
        const coveredLines: number[][] = [];
        Object.keys(fileCoverage.branchMap).forEach((branchKey) => {
            const branchCoverage = fileCoverage.b[branchKey];
            if (branchCoverage !== undefined) {
                const branches = fileCoverage.branchMap[branchKey].locations;
                let i: number = 0;
                branches.forEach((branch: any) => {
                    if (branchCoverage[i] === 0 && branch.end.column !== null) {
                        const line = branch;
                        if (selectionRange && selectionRange.start <= line.start.line && selectionRange.end >= line.start.line) {
                            coveredLines.push(this.parseLineData(line, 2));
                        } else if (!selectionRange) {
                            coveredLines.push(this.parseLineData(line, 2));
                        }
                    }
                    i++;
                });
            }
        });
        return coveredLines;
    }

    private getFunctionCoverage(fileCoverage: any, selectionRange?: SelectionRange): number[][] {
        const coveredLines: number[][] = [];
        Object.keys(fileCoverage.fnMap).forEach((functionKey) => {
            const functionCoverage = fileCoverage.f[functionKey];
            if (functionCoverage !== undefined && functionCoverage === 0) {
                const line = fileCoverage.fnMap[functionKey].decl;
                if (selectionRange && selectionRange.start <= line.start.line && selectionRange.end >= line.start.line) {
                    coveredLines.push(this.parseLineData(line, 3));
                } else if (!selectionRange) {
                    coveredLines.push(this.parseLineData(line, 3));
                }
            }
        });
        return coveredLines;
    }

    /**
     * @param line : start end lines with line and column values
     * @param type : coverage type. 1=statement, 2=branch, 3=function
     * @returns
     */
    private parseLineData(line: any, type: number): number[] {
        let startLine: number = line.start.line !== null ? line.start.line : 0;
        let startCol: number = line.start.column !== null ? line.start.column : 0;
        let endLine: number = line.end.line !== null ? line.end.line : 0;
        let endCol: number = line.end.column !== null ? line.end.column : startCol + 1;
        return [startLine, startCol, endLine, endCol, type];
    }
}