PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_historical_data_points` (
	`timestamp_ms` integer NOT NULL,
	`heart_rate` integer NOT NULL,
	`rr` text NOT NULL,
	`device_name` text(100) NOT NULL,
	`unknown` integer NOT NULL,
	PRIMARY KEY(`timestamp_ms`, `device_name`)
);
--> statement-breakpoint
INSERT INTO `__new_historical_data_points`("timestamp_ms", "heart_rate", "rr", "device_name", "unknown") SELECT "timestamp_ms", "heart_rate", "rr", "device_name", "unknown" FROM `historical_data_points`;--> statement-breakpoint
DROP TABLE `historical_data_points`;--> statement-breakpoint
ALTER TABLE `__new_historical_data_points` RENAME TO `historical_data_points`;--> statement-breakpoint
PRAGMA foreign_keys=ON;