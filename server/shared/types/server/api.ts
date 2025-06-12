import type { ServerStatus } from './status';
import type { onebot_adapters } from '../adapters/adapter';
import type { Player } from '../player/player';
import type { SocialAccount } from '../account/account';
import type { Server } from './server';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export type ServerWithStatus = Server & ServerStatus;

// 常用类型别名（如有需要可保留，否则建议直接用 ApiResponse<T>）
export type ServerListResponse = ApiResponse<ServerStatus[]>;
export type AdapterListResponse = ApiResponse<onebot_adapters[]>;
export type PlayerListResponse = ApiResponse<Player[]>;
export type SocialAccountListResponse = ApiResponse<SocialAccount[]>;
