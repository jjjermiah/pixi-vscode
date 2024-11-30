import { PixiPlatform } from "./enums";

// OLD TYPES
export interface PixiTaskInfo {
  environment: string;
  tasks: Task[];
}

export interface Task {
  name: string;
  cmd: string;
  depends_on: string[];
  description: null;
  cwd: null;
  env: null;
  clean_env: boolean;
}
// NEW TYPES
export interface EnvFeatureTaskList {
  environment: string;
  features:    Feature[];
}

export interface Feature {
  name:  string;
  tasks: Task[];
}

export interface TaskInfo {
  name:        string;
  cmd:         null | string;
  description: null | string;
  depends_on:  string[];
  cwd:         null;
  env:         null;
  clean_env:   boolean;
  inputs:      string[] | null;
  outputs:     string[] | null;
}


export interface PixiInfo {
  platform: string;
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
