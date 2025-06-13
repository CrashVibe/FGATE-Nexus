// 服务器状态类型
export interface ServerStatus {
    isOnline: boolean;
    playerCount: number;
    lastSeen: Date | null;
    supportsRcon: boolean;
    supportsPapi: boolean;
    software: string;
    version: string;
}
