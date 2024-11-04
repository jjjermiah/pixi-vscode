import { PixiPlatform } from "./enums";

export type PixiProjectInfo = {
	manifest_path: string;
	last_updated: string;
	pixi_folder_size?: number;
	version: string;
};


export type environments_info = {
	name: string;
	features: string[];
	solve_group: string;
	environment_size: number;
	dependencies: string[];
	tasks: string[];
	channels: string[];
	prefix: string;
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