PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_resting_heart_rate_24h` (
	`timestamp_ms` integer NOT NULL,
	`measured_at_ms` integer DEFAULT 0 NOT NULL,
	`heart_rate` integer NOT NULL,
	`device_name` text(100) NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
INSERT INTO `__new_resting_heart_rate_24h`("timestamp_ms", "measured_at_ms", "heart_rate", "device_name") SELECT "timestamp_ms", "measured_at_ms", "heart_rate", "device_name" FROM `resting_heart_rate_24h`;--> statement-breakpoint
DROP TABLE `resting_heart_rate_24h`;--> statement-breakpoint
ALTER TABLE `__new_resting_heart_rate_24h` RENAME TO `resting_heart_rate_24h`;--> statement-breakpoint
PRAGMA foreign_keys=ON;