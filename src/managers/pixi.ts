import * as vscode from "vscode";
import { execShellWithTimeout } from "../common/shell";
import { PixiPlatform, PixiProjectType } from "../enums";
import { PixiInfo } from "../types";
import { PixiToolPath } from "../config";

export class Pixi {
  // save the output of the pixi info command
  public pixiInfo!: PixiInfo;
  public manifestPath: string;

  constructor(manifestPath: string) {
    this.manifestPath = manifestPath;

    // create a file watcher using vscode's FileSystemWatcher
    const watcher = vscode.workspace.createFileSystemWatcher(manifestPath);

    // when the file is changed, update the pixiInfo
    watcher.onDidChange(() => {
      this.getPixiInfo().then((info) => {
        if (info) {
          this.pixiInfo = info;
        }
      });
    });
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
}
