import type { Player, SocialAccount } from './player';

export interface PlayerWithAccounts extends Player {
    socialAccounts: SocialAccount[];
}

export type PlayerListResponse =
    | { success: true; data: PlayerWithAccounts[] }
    | { success: false; message: string };

