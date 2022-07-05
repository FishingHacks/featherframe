import { App, cliConfig } from "../types";
import { Application } from "express";

declare interface BackendPage {
  origin: string;
  path: string;
  method: string;
  regex: string;
}

declare interface FrontendPage {
    regex: string;
    path: string;
}

declare interface BuildObject {
  middlewarefiles: Array<string>;
  backendpages: Array<BackendPage>;
  frontendpages: Array<FrontendPage>;
}

export declare function loadApp(
  path: string,
  express: Application,
  config: cliConfig
): App;
export declare function build(path: string, config: cliConfig): BuildObject;