import { PixiPlatform } from "./enums";

/** Output of `pixi task ls --json` 
 * 
 * Mapping is:
 * 
 * - environment
 *  - features
 *   - tasks
 */

export interface EnvFeatureTaskList {
  environment: string;
  features: Feature[];
}

export interface Feature {
  name: string;
  tasks: TaskInfo[];
}

export interface TaskInfo {
  name: string;
  cmd: null | string;
  description: null | string;
  depends_on: string[];
  cwd: null;
  env: null;
  clean_env: boolean;
  inputs: string[] | null;
  outputs: string[] | null;
}


/** Output of `pixi info --json`
 * 
 * Probably subject to change as the Pixi CLI evolves
 */

export interface PixiInfo {
  platform: PixiPlatform;
  virtual_packages: string[];
  version: string;
  cache_dir: string;
  cache_size: null;
  auth_dir: string;
  global_info: GlobalInfo;
  project_info: ProjectInfo;
  environments_info: EnvironmentsInfo[];
  config_locations: string[];
}

export interface EnvironmentsInfo {
  name: string;
  features: string[];
  solve_group: null;
  environment_size: null;
  dependencies: any[];
  pypi_dependencies: any[];
  platforms: string[];
  tasks: any[];
  channels: string[];
  prefix: string;
}

export interface GlobalInfo {
  bin_dir: string;
  env_dir: string;
  manifest: string;
}

export interface ProjectInfo {
  name: string;
  manifest_path: string;
  last_updated: null;
  pixi_folder_size: null;
  version: string;
}
