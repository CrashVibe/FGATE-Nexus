PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_onebot_adapters` (
	`adapter_id` integer PRIMARY KEY NOT NULL,
	`access_token` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`connection_type` text DEFAULT 'reverse' NOT NULL,
	`host` text NOT NULL,
	`port` integer NOT NULL,
	`auto_reconnect` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`adapter_id`) REFERENCES `adapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_onebot_adapters`("adapter_id", "access_token", "enabled", "connection_type", "host", "port", "auto_reconnect") SELECT "adapter_id", "access_token", "enabled", "connection_type", "host", "port", "auto_reconnect" FROM `onebot_adapters`;--> statement-breakpoint
DROP TABLE `onebot_adapters`;--> statement-breakpoint
ALTER TABLE `__new_onebot_adapters` RENAME TO `onebot_adapters`;--> statement-breakpoint
PRAGMA foreign_keys=ON;