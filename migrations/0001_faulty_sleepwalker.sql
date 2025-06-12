DROP TABLE `advanced_configs`;--> statement-breakpoint
ALTER TABLE `servers` ADD `adapter_id` integer REFERENCES onebot_adapters(id);