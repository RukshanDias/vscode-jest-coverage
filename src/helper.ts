export class Helper {
    static isFileAvailable(uri: string): boolean {
        const fs = require("fs");

        try {
            fs.accessSync(uri, fs.constants.F_OK);
            console.log(`${uri} exists`);
            return true;
        } catch (err) {
            console.error(`${uri} does not exist`);
            return false;
        }
    }
}
