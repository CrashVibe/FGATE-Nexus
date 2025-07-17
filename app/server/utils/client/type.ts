import type { AdapterInternal, Peer } from 'crossws';

export interface JsonRpcRequest<P = unknown> {
    jsonrpc: string;
    method: string;
    params?: P;
    id: string | null;
}

export interface JsonRpcResponse<R = unknown, E = unknown> {
    jsonrpc: string;
    result: R;
    error?: {
        code: number;
        message: string;
        data?: E;
    };
    id: string | null;
}

export interface ServerInfo {
    minecraft_version: string;
    server_type: string;
    supports_papi: boolean;
    supports_rcon: boolean;
}

export interface ClientInfo {
    server_id: string;
    peer: Peer<AdapterInternal>;
    isAlive: boolean;
    lastPing: number;
    playerCount: number;
    serverInfo?: ServerInfo;
    token: string;
    clientVersion: string;
}

export interface PendingRequest<T = unknown> {
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
    timeout: NodeJS.Timeout;
}
