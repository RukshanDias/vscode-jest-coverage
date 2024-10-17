import { GetLogLevel } from '../config';

export class Logger {
    private static isDebugEnabled(): boolean {
        return GetLogLevel() === 'debug';
    }

    public static debug(message: string, ...optionalParams: any[]): void {
        if (this.isDebugEnabled()) {
            console.log(message, ...optionalParams);
        }
    }

}