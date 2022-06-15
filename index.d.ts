import {App, cliConfig} from "./types";
import { Application } from "express";

export function loadApp (path: string, express: Application, config: cliConfig): App;