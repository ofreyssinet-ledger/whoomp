CREATE TABLE `heart_rate_avg_1min` (
	`timestamp_ms` integer,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
CREATE TABLE `heart_rate_avg_2min` (
	`timestamp_ms` integer,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
CREATE TABLE `heart_rate_avg_5min` (
	`timestamp_ms` integer,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
CREATE TABLE `historical_data_points` (
	`timestamp_ms` integer NOT NULL,
	`heart_rate` integer NOT NULL,
	`rr` text,
	`device_name` text(100) NOT NULL,
	`unknown` integer NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
CREATE TABLE `known_device` (
	`device_id` text PRIMARY KEY NOT NULL,
	`device_name` text(100) NOT NULL,
	`last_connected_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `last_sync` (
	`device_name` text(100) PRIMARY KEY NOT NULL,
	`last_synced_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resting_heart_rate_24h` (
	`timestamp_ms` integer,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
