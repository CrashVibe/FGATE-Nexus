CREATE TABLE `adapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `message_filter_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_id` integer NOT NULL,
	`keyword` text NOT NULL,
	`replacement` text DEFAULT '' NOT NULL,
	`direction` text DEFAULT 'both' NOT NULL,
	`match_mode` text DEFAULT 'contains' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `message_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_id` integer NOT NULL,
	`content` text NOT NULL,
	`direction` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `onebot_adapters` (
	`adapter_id` integer PRIMARY KEY NOT NULL,
	`bot_id` integer,
	`access_token` text,
	`response_timeout` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`connection_type` text DEFAULT 'reverse' NOT NULL,
	`forward_url` text,
	`auto_reconnect` integer DEFAULT true,
	FOREIGN KEY (`adapter_id`) REFERENCES `adapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
CREATE TABLE `server_binding_configs` (
	`server_id` integer PRIMARY KEY NOT NULL,
	`max_bind_count` integer NOT NULL,
	`code_length` integer NOT NULL,
	`code_mode` text NOT NULL,
	`code_expire` integer NOT NULL,
	`allow_unbind` integer NOT NULL,
	`prefix` text NOT NULL,
	`unbind_prefix` text NOT NULL,
	`force_bind` integer NOT NULL,
	`kick_msg` text NOT NULL,
	`unbind_kick_msg` text NOT NULL,
	`bind_success_msg` text NOT NULL,
	`bind_fail_msg` text NOT NULL,
	`unbind_success_msg` text NOT NULL,
	`unbind_fail_msg` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `server_message_sync_configs` (
	`server_id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`mc_to_qq` integer DEFAULT true NOT NULL,
	`qq_to_mc` integer DEFAULT true NOT NULL,
	`group_ids` text DEFAULT '[]' NOT NULL,
	`mc_to_qq_template` text DEFAULT '[{server}] {player}: {message}' NOT NULL,
	`qq_to_mc_template` text DEFAULT '[QQ] {nickname}: {message}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
