import type { Player } from './player';

export type PlayerListResponse =
    | { success: true; data: Player[] }
    | { success: false; message: string };
