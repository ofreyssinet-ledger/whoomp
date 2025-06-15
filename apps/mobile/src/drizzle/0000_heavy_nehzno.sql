CREATE TABLE `heart_rate_avg_1min` (
	`timestamp_ms` integer PRIMARY KEY NOT NULL,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `heart_rate_avg_2min` (
	`timestamp_ms` integer PRIMARY KEY NOT NULL,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `heart_rate_avg_5min` (
	`timestamp_ms` integer PRIMARY KEY NOT NULL,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resting_heart_rate_24h` (
	`timestamp_ms` integer PRIMARY KEY NOT NULL,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL
);
