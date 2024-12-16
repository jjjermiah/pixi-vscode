import * as vscode from "vscode";

function getPixiExecutablePath(): string {
  const config = vscode.workspace.getConfiguration("pixi-vscode");
  const executablePath = config.get<string>("executablePath");
  return executablePath || "pixi";
}

export const PixiToolPath = getPixiExecutablePath();

function getPixiIgnore(): string[] {
  const config = vscode.workspace.getConfiguration("pixi-vscode.projects");
  const ignore = config.get<string[]>("ignore");
  return ignore || [];
}

export const PixiIgnore = getPixiIgnore();
