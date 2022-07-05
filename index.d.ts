export declare class VNode {
    readonly tag: string;
    render(xmlns?: string): HTMLElement;
    addChild(children: VNode|string): void;
    remChild(children: VNode|string): void;
    setAttribute(name: string, value: string): void;
    getAttribute(name: string): string;
    readonly attributes: {[name: string]: any, events: {[name: string]: any}};
    readonly children: Array<VNode|string>;
    readonly name: string;
}

export declare function rerender(): void;
export declare function render(nodes: Array<VNode>, mnt?: HTMLElement): void;
export declare function require(module: string): unknown;
export declare function loadModules(modules: string): Promise<void>;
export declare function goto(pathname: string);
export declare function useFetch(url: string, parameter?: RequestInit): {
    data: any;
    loading: boolean;
    invalidate: () => void;
    change: (url: string|undefined, parameters?: RequestInit) => void;
    refetch: () => void;
    error: boolean;
    request: Request;
};
export declare function redirect(url: string): void;
export declare function matchpath(path: string, pathname?: string): void;
export declare function requireScript(path: string, isModule?: boolean): void;
export declare function requireCSS(path: string): void;
export declare function html(strings: TemplateStringsArray, ...expr: Array<any>): Array<VNode>;
export declare function App(): Array<VNode>;
export declare function useContext(key: string): unknown;
export declare function useMemo<T>(f: ()=>T, deps: Array<any>|any): T;
export declare function createContext<T>(ctxValue: T, key: string): string;
export declare function useReducer<T>(reducer: (state: T, action: {type: string, payload: any})=>T, initialValue: T): [T, (action: {type: string, payload: any})=>void];
export declare function useRef<T>(initialValue: T): {current: T};
export declare function getTitle(): string;
export declare function getFuncName(fn: Function): string|null;
export declare function setTitle(title: string): void;
export declare function useIDState<T>(id: string, initialValue: T): [T, (value: T|((value: T)=>T))=>void];
export declare function useState<T>(initialValue: T): [T, (value: T|((value: T)=>T))=>void];
export declare function h(tag: string, attributes: {events?: {[name:string]:any},[name:string]:any}, ...children: Array<string|VNode>);