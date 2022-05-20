import {Config} from "./config";

export class App {
    constructor(path);
    get path(): string;
    get html(): string;
    get config(): Config;
}