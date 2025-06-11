declare module 'bun:sqlite' {
  const Database: any;
  export { Database };
}

declare module 'better-sqlite3';

declare module './migrations/meta';
declare module './.output/server/index.mjs';
declare module './.nuxt/eslint.config.mjs';
