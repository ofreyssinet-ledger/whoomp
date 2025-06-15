PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_heart_rate_avg_1min` (
	`timestamp_ms` integer NOT NULL,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
INSERT INTO `__new_heart_rate_avg_1min`("timestamp_ms", "heart_rate", "device_name") SELECT "timestamp_ms", "heart_rate", "device_name" FROM `heart_rate_avg_1min`;--> statement-breakpoint
DROP TABLE `heart_rate_avg_1min`;--> statement-breakpoint
ALTER TABLE `__new_heart_rate_avg_1min` RENAME TO `heart_rate_avg_1min`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_heart_rate_avg_2min` (
	`timestamp_ms` integer NOT NULL,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
INSERT INTO `__new_heart_rate_avg_2min`("timestamp_ms", "heart_rate", "device_name") SELECT "timestamp_ms", "heart_rate", "device_name" FROM `heart_rate_avg_2min`;--> statement-breakpoint
DROP TABLE `heart_rate_avg_2min`;--> statement-breakpoint
ALTER TABLE `__new_heart_rate_avg_2min` RENAME TO `heart_rate_avg_2min`;--> statement-breakpoint
CREATE TABLE `__new_heart_rate_avg_5min` (
	`timestamp_ms` integer NOT NULL,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
INSERT INTO `__new_heart_rate_avg_5min`("timestamp_ms", "heart_rate", "device_name") SELECT "timestamp_ms", "heart_rate", "device_name" FROM `heart_rate_avg_5min`;--> statement-breakpoint
DROP TABLE `heart_rate_avg_5min`;--> statement-breakpoint
ALTER TABLE `__new_heart_rate_avg_5min` RENAME TO `heart_rate_avg_5min`;--> statement-breakpoint
CREATE TABLE `__new_resting_heart_rate_24h` (
	`timestamp_ms` integer NOT NULL,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
INSERT INTO `__new_resting_heart_rate_24h`("timestamp_ms", "heart_rate", "device_name") SELECT "timestamp_ms", "heart_rate", "device_name" FROM `resting_heart_rate_24h`;--> statement-breakpoint
DROP TABLE `resting_heart_rate_24h`;--> statement-breakpoint
ALTER TABLE `__new_resting_heart_rate_24h` RENAME TO `resting_heart_rate_24h`;