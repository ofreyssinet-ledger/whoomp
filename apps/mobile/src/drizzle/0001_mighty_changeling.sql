CREATE TABLE `known_device` (
	`device_id` text PRIMARY KEY NOT NULL,
	`device_name` text(100) NOT NULL,
	`last_connected_ms` integer NOT NULL
);
