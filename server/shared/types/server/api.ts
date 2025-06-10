import type { Server } from './server';

// 扩展服务器类型以包含在线状态
export interface ServerWithStatus extends Server {
    isOnline: boolean;
}

export type ServerListResponse =
    | {
          success: true;
          data: ServerWithStatus[];
      }
    | {
          success: false;
          message: string;
      };
