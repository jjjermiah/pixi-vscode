import * as log from "./common/logging";
import * as notif from "./common/notification";
import { getConfiguration } from "./common/vscode";

function getPixiExecutablePath(): string {
  const config = getConfiguration("pixi-vscode");
  const executablePath = config.get<string>("executablePath");
  return executablePath || "pixi";
}

export const PixiToolPath = getPixiExecutablePath();

function getPixiSearchDepth(): number {
  const config = getConfiguration("pixi-vscode.projects");
  const searchDepth = config.get<number>("searchDepth");

  // make sure it's valid!
  if (searchDepth && searchDepth > 0) {
    return searchDepth;
  } else {
    log.warn(`Invalid search depth: ${searchDepth}`);
    notif.error(`Invalid search depth: ${searchDepth} using default of 3`);
    return 3;
  }
}

export const PixiSearchDepth = getPixiSearchDepth();

function getPixiIgnore(): string[] {
  const config = getConfiguration("pixi-vscode.projects");
  const ignore = config.get<string[]>("ignore");
  return ignore || [];
}

export const PixiIgnore = getPixiIgnore();

function getPixiGitignore(): boolean {
  const config = getConfiguration("pixi-vscode.projects");
  const useGitignore = config.get<boolean>("gitignore");
  return useGitignore || false;
}

export const PixiGitignore = getPixiGitignore();
