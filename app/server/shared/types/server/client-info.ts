// get.client.info 响应类型
export interface GetClientInfoResult {
    data: {
        minecraft_version: string;
        minecraft_software: string;
        supports_papi: boolean;
        supports_rcon: boolean;
        playerCount: number;
    };
}
