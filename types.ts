export interface cliConfig {
    debugprint?: boolean,
}

export interface config {
    readonly customHTML?: string;
    /**
     * Not implemented yet
     */
    readonly launch?: Array<string>;
    readonly name: string;
    readonly description: string;
    readonly e404page?: string;
}

export declare class App {
    /**
     * @param path the path to the application
     */
    constructor(path: string);
    readonly path: string;
    readonly html: string;
    readonly config: config;
}