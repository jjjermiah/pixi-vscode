import * as vscode from "vscode";
import * as log from "../common/logging";
import { execShellWithTimeout } from "../common/shell";
import { PixiPlatform, PixiProjectType } from "../enums";
import { PixiInfo, EnvFeatureTaskList } from "../types";
import { PixiToolPath } from "../config";

export class Pixi {
  private _pixiInfo?: PixiInfo;
  public pixiTaskInfo!: EnvFeatureTaskList[];
  public manifestPath: string;

  constructor(manifestPath: string) {
    this.manifestPath = manifestPath;
    this.initializePixiInfo();
    this.setupFileWatcher();
  }

  private async initializePixiInfo(): Promise<void> {
    try {
      const result = await this.getPixiInfo();
      if (result && this._pixiInfo?.project_info) {
        log.info('Valid Pixi manifest at ', this.manifestPath);
        log.debug('Pixi Info:', {
          project: this._pixiInfo.project_info,
          environments: this._pixiInfo.environments_info.map((env) => ({
            name: env.name,
            prefix: env.prefix,
            features: env.features,
            tasks: env.tasks.length,
            dependencies: concat(env.dependencies, env.pypi_dependencies)
          }))
        });
        const taskResult = await this.getPixiTaskEnvironments();
        if (taskResult && this.pixiTaskInfo.length > 0) {
          log.info(`Pixi Task Environments initialized for ${this.projectName()} with ${this.pixiTaskInfo.length} tasks`);
        } else {
          log.warn('Failed to initialize Pixi Task Environments', this.manifestPath);
        }
      } else {
        log.warn('Invalid Pixi manifest at ', this.manifestPath);
      }
    } catch (error) {
      log.error('Error initializing Pixi Info', error);
    }
  }

  private setupFileWatcher(): void {
    const fileWatcher = vscode.workspace.createFileSystemWatcher(this.manifestPath || "");
    fileWatcher.onDidChange(() => this.reset());
    fileWatcher.onDidDelete(() => {
      log.error(`Manifest file ${this.manifestPath} was deleted`);
    });
  }

  private async reset(): Promise<boolean> {
    log.debug("Resetting Pixi Info for ", this.manifestPath);
    try {
      await this.getPixiInfo();
      if (this._pixiInfo?.project_info) {
        const result = await this.getPixiTaskEnvironments()
          .then(() => {
            log.debug("Pixi Task Environments initialized");
            return true;
          })
          .catch((error) => {
            log.error("Failed to initialize Pixi Task Environments", error);
            return false;
          });
        return result;
      } else {
        log.error("Failed to initialize Pixi Info");
        return false;
      }
    } catch (error) {
      log.error("Failed to reset Pixi Info", error);
      return false;
    }
  }

  public async getPixiInfo(): Promise<PixiInfo> {
    try {
      const output = await execShellWithTimeout(
        `${PixiToolPath} info --manifest-path ${this.manifestPath} --json`,
        5000
      );
      this.pixiInfo = JSON.parse(output) as PixiInfo;
      return this.pixiInfo;
    } catch (error) {
      log.warn("Pixi info Error", error);
      throw new Error("Failed to fetch PixiInfo");
    }
  }

  public projectName(): string {
    return this.pixiInfo.project_info.name;
  }

  public get pixiInfo(): PixiInfo {
    if (!this._pixiInfo) {
      throw new Error("PixiInfo has not been initialized yet.");
    }
    return this._pixiInfo;
  }

  public set pixiInfo(value: PixiInfo) {
    this._pixiInfo = value;
  }

  public async getPixiTaskEnvironments(force: boolean = false): Promise<EnvFeatureTaskList[]> {
    if (!force && this.pixiTaskInfo && this.pixiTaskInfo.length > 0) {
      return this.pixiTaskInfo;
    }
    if (force) {
      log.debug("Forcing Pixi Task Environments refresh");
    }
    try {
      const output = await execShellWithTimeout(
        `${PixiToolPath} task --manifest-path ${this.manifestPath} list --json`,
        5000
      );
      this.pixiTaskInfo = JSON.parse(output) as EnvFeatureTaskList[];
      return this.pixiTaskInfo;
    } catch (error) {
      log.debug("Failed to retrieve PixiTaskInfo", this.manifestPath, error);
      return [];
    }
  }

  public EnvironmentNames(): string[] {
    return this.pixiInfo.environments_info.map((env) => env.name);
  }

  public EnvironmentPrefixes(): string[] {
    return this.pixiInfo.environments_info.map((env) => env.prefix);
  }

  public Features(manifestPath?: string): string[] {
    return this.pixiInfo.environments_info.flatMap((env) => env.features);
  }
}

function concat(dependencies: any[], pypi_dependencies: any[]): any[] {
  return [...dependencies, ...pypi_dependencies];
}
