import { debug, info, warn, error } from "../common/logging";
import * as shell from "../common/shell";
import { PixiInfo } from "../common/types/pixi_info";
import { getPixiExecutablePath } from "../common/config";
import * as vscode from "vscode";

export class Pixi {
  private pixiInfo: PixiInfo | null = null;

  constructor(public manifestPath: string) {
    this.initialize();
  }

  private setupFileWatcher(): void {
    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      this.manifestPath || ""
    );
    fileWatcher.onDidChange(() => {
      info(`Manifest updated. Resetting Pixi Info for ${this.manifestPath}`);
      this.initialize();
    });
    fileWatcher.onDidDelete(() => {
      error(`Manifest file ${this.manifestPath} was deleted`);
    });
  }

  private async initialize(): Promise<void> {
    try {
      const info = await this.getPixiInfo();

      if (!info) {
        throw new Error("Failed to get Pixi Info");
      }

      if (!info.project_info) {
        throw new Error("Not a valid Pixi Project, missing 'project_info'");
      }

      this.logPixiInfo(info);
    } catch (error) {
      if (error instanceof Error) {
        warn(error.message, this.manifestPath);
      } else {
        warn(`An unknown error occurred. Error: ${error}`, this.manifestPath);
      }
    }
  }

  public async EnvironmentNames(): Promise<string[]> {
    if (!this.pixiInfo) {
      return [];
    }

    return this.pixiInfo.environments_info.map((env) => env.name);
  }

  private async getPixiInfo(): Promise<PixiInfo | null> {
    try {
      const output = await shell.execShellWithTimeout(
        `${getPixiExecutablePath()} info --manifest-path ${
          this.manifestPath
        } --json`,
        5000
      );
      this.pixiInfo = JSON.parse(output) as PixiInfo;
      return this.pixiInfo;
    } catch (error) {
      warn("Error executing shell command", error);
      return null;
    }
  }

  private logPixiInfo(info: PixiInfo): void {
    debug(`Pixi Info: ${this.manifestPath}`, {
      project_name: info.project_info.name,
      environments: info.environments_info.map((env) => ({
        name: env.name,
        features: env.features.length,
        tasks: env.tasks.length,
        dependencies: `conda: ${env.dependencies.length} + pypi: ${env.pypi_dependencies.length}`,
      })),
    });
  }
}
