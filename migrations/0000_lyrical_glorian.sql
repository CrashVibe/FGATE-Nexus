CREATE TABLE `adapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `onebot_adapters` (
	`adapter_id` integer PRIMARY KEY NOT NULL,
	`bot_id` integer NOT NULL,
	`access_token` text,
	`response_timeout` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`adapter_id`) REFERENCES `adapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bot_id_idx` ON `onebot_adapters` (`bot_id`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`uuid` text NOT NULL,
	`ip` text,
	`social_account_id` integer,
	`servers` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`social_account_id`) REFERENCES `social_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_uuid_idx` ON `players` (`uuid`);--> statement-breakpoint
CREATE TABLE `servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`software` text,
	`version` text,
	`adapter_id` integer,
	FOREIGN KEY (`adapter_id`) REFERENCES `adapters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `name_idx` ON `servers` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `token_idx` ON `servers` (`token`);--> statement-breakpoint
CREATE TABLE `social_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`adapter_type` text NOT NULL,
	`name` text NOT NULL,
	`uiuid` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
