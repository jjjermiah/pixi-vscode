import * as vscode from "vscode";
import { execShellWithTimeout } from "../common/shell";
import { PixiPlatform, PixiProjectType } from "../enums";
import { PixiInfo, PixiTaskInfo as PixiTaskEnvironments } from "../types";
import { PixiToolPath } from "../config";

export class Pixi {
  // save the output of the pixi info command
  public pixiInfo!: PixiInfo;
  public pixiTaskInfo: PixiTaskEnvironments[] = [];
  public manifestPath: string;

  constructor(manifestPath: string) {
    this.manifestPath = manifestPath;

    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      manifestPath || ""
    );
    fileWatcher.onDidChange(() => this.reset());
    fileWatcher.onDidCreate(() => this.reset());
    fileWatcher.onDidDelete(() => this.reset());
  }

  private async reset(): Promise<void> {
    await Promise.all([this.getPixiInfo(), this.getPixiTaskEnvironments()]);
  }

  public projectName(): string {
    return this.pixiInfo.project_info.name;
  }

  public async getPixiInfo(): Promise<PixiInfo> {
    if (this.pixiInfo) {
      return this.pixiInfo;
    }
    this.pixiInfo = await execShellWithTimeout(
      `${PixiToolPath} info --json --manifest-path ${this.manifestPath}`,
      5000
    ).then((output) => JSON.parse(output) as PixiInfo);

    return this.pixiInfo;
  }

  public async getPixiTaskEnvironments(): Promise<PixiTaskEnvironments[]> {
    if (this.pixiTaskInfo.length > 0) {
      return this.pixiTaskInfo;
    }
    // it will defiinitely return a valu,e or `No tasks found` if no tasks are found
    this.pixiTaskInfo = await execShellWithTimeout(
      `${PixiToolPath} task --manifest-path ${this.manifestPath} list --json `,
      5000
    )
      .then((output) => {
        try {
          return JSON.parse(output) as PixiTaskEnvironments[];
        } catch (error) {
          return [];
        }
      })
      .catch((error) => {
        console.error(error);
        return [];
      });
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
