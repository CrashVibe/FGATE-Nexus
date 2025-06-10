import type { AdapterInternal, Peer } from 'crossws';

export interface JsonRpcRequest {
    jsonrpc: string;
    method?: string;
    params?: any;
    id?: string | null;
}

export interface JsonRpcResponse {
    jsonrpc: string;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
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
    id: string;
    peer: Peer<AdapterInternal>;
    isAlive: boolean;
    lastPing: number;
    playerCount: number;
    serverInfo?: ServerInfo;
    token: string;
    clientVersion: string;
}

export interface PendingRequest {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    timeout: NodeJS.Timeout;
}
