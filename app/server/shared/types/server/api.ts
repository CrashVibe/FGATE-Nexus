import type { ServerStatus } from './status';
import type { Player, EnhancedPlayer } from '../player/player';
import type { SocialAccount } from '../account/account';
import type { Server } from './server';
import type { AdapterUnionType } from '~/server/utils/adapters/adapterManager';

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

export type ServerWithStatus = Server & ServerStatus;

// 常用类型别名（如有需要可保留，否则建议直接用 ApiResponse<T>）
export type ServerListResponse = ApiResponse<ServerStatus[]>;
export type AdapterListResponse = ApiResponse<AdapterUnionType[]>;
export type PlayerListResponse = ApiResponse<Player[]>;
export type EnhancedPlayerListResponse = ApiResponse<EnhancedPlayer[]>;
export type SocialAccountListResponse = ApiResponse<SocialAccount[]>;
