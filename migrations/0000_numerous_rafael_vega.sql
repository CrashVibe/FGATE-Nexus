CREATE TABLE `advanced_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_id` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `advanced_server_id_idx` ON `advanced_configs` (`server_id`);--> statement-breakpoint
CREATE TABLE `onebot_adapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`adapter_type` text NOT NULL,
	`bot_id` integer NOT NULL,
	`access_token` text,
	`listen_path` text NOT NULL,
	`response_timeout` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bot_id_idx` ON `onebot_adapters` (`bot_id`);--> statement-breakpoint
CREATE TABLE `servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`software` text,
	`version` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `name_idx` ON `servers` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `token_idx` ON `servers` (`token`);