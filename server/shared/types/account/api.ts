import type { SocialAccount } from './account';

export type SocialAccountListResponse =
    | { success: true; data: SocialAccount[] }
    | { success: false; message: string };
