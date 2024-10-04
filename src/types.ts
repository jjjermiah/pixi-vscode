import { PixiPlatform } from "./enums";

export type PixiProjectInfo = {
	name: string;
	manifest_path: string;
	last_updated: string;
	pixi_folder_size?: number;
	version: string;
};

// This type corresponds to the output of 'pixi info --json', and property
// names must be spelled exactly as they are in order to match the schema.
export type PixiInfo = {
	platform: PixiPlatform;
	virtual_packages: string[];
	version: string;
	cache_dir: string;
	cache_size?: number;
	auth_dir: string;

	project_info?: PixiProjectInfo;

	environments_info: environments_info[];
};

export type environments_info = {
	name: string;
	features: string[];
	solve_group: string;
	environment_size: number;
	dependencies: string[];
	pypi_dependencies: string[];
	tasks: string[];
	channels: string[];
	prefix: string;
};

// a task PixiTask type is constructed from PixiInfo["environments_info"]
// and is used to represent a task in the Pixi environment and the relationships
// this can then be used in a quickpick menu and show the environment for tasks that are
// present in multiple environment
export type PixiTask = {
	name: string;
	environment: string; // PixiInfo["environments_info"].name
};
