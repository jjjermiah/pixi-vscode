import * as vscode from "vscode";
import * as log from "../common/logging";
import { execShellWithTimeout } from "../common/shell";
import { PixiPlatform, PixiProjectType } from "../enums";
import { PixiInfo, EnvFeatureTaskList  } from "../types";
import { PixiToolPath } from "../config";

export class Pixi {
  // save the output of the pixi info command
  // public pixiInfo!: PixiInfo;
  private _pixiInfo?: PixiInfo;
  public pixiTaskInfo!: EnvFeatureTaskList[];
  public manifestPath: string;

  constructor(manifestPath: string) {
    this.manifestPath = manifestPath;

    // Check if the manifest is valid

    this.getPixiInfo().then((result) => {
      if (result && this._pixiInfo?.project_info) {
        log.info('Valid Pixi manifest at ', manifestPath);
        log.info(result);
      } else {
        log.warn('Invalid Pixi manifest at ', manifestPath);
      }
    });

    this.getPixiTaskEnvironments().then((result) => {
      if (result && this.pixiTaskInfo.length > 0) {
        log.info(`Pixi Task Environments initialized for ${this.projectName()} with ${this.pixiTaskInfo.length} tasks`);
      } else {
        log.warn('Failed to initialize Pixi Task Environments');
      }
    });

    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      manifestPath || ""
    );
    fileWatcher.onDidChange(() => this.reset());
    fileWatcher.onDidDelete(() => {
      log.error(`Manifest file ${manifestPath} was deleted`);
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
    // Implementation for fetching PixiInfo
    this.pixiInfo = await execShellWithTimeout(
      `${PixiToolPath} info --manifest-path ${this.manifestPath} --json`,
      5000
    )
      .then((output) => {
        try {
          return JSON.parse(output) as PixiInfo;
        } catch (error) {
          throw new Error("Failed to parse PixiInfo");
        }
      })
      .catch((error) => {
        log.warn("Pixi info Error", error);
        throw new Error("Failed to fetch PixiInfo");
      });
    
    return this.pixiInfo;
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
    if(force){
      log.debug("Forcing Pixi Task Environments refresh");
    }
    // it will defiinitely return a valu,e or `No tasks found` if no tasks are found
    let pixiTaskInfo = await execShellWithTimeout(
        `${PixiToolPath} task --manifest-path ${this.manifestPath} list --json `,
        5000
      )
      .then((output) => {
        try {
          return JSON.parse(output) as EnvFeatureTaskList[];
        } catch (error) {
          log.debug("Failed to parse PixiTaskInfo");
          return [];
        }
      })
      .catch((error) => {
        log.debug("Failed to retrieve PixiTaskInfo", this.manifestPath, error);
        return [];  
      });
    this.pixiTaskInfo = pixiTaskInfo;
    return this.pixiTaskInfo;
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
