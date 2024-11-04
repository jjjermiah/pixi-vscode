// a set of functions to help with file system operations
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as ignore from "ignore";
import * as log from "./logging";

import { Pixi } from "../managers/pixi";
import { getWorkspaceFolders } from "./vscode";
import { PixiIgnore, PixiGitignore } from "../config";

let totalIgnored = 0;
function searchFiles(
  currentPath: string,
  currentDepth: number,
  depth: number,
  folderPath: string
): string[] {
  if (currentDepth > depth) return [];
  const gitignore = ignore.default();
  const foundFiles: string[] = [];

  if (PixiGitignore) {
    const gitignorePath = path.join(folderPath, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContents = fs.readFileSync(gitignorePath, "utf8");
      gitignore.add(gitignoreContents);
    }
  }

  gitignore.add(PixiIgnore);

  const contents = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const item of contents) {
    const itemPath = path.join(currentPath, item.name);

    if (gitignore.ignores(path.relative(folderPath, itemPath))) {
      totalIgnored++;
      continue;
    }

    if (item.isDirectory()) {
      foundFiles.push(...searchFiles(itemPath, currentDepth + 1, depth, folderPath));
    } else if (
      item.isFile() &&
      (item.name === "pixi.toml" || item.name === "pyproject.toml")
    ) {
      foundFiles.push(itemPath);
    }
  }
  return foundFiles;
}

export function getWorkspaceFiles(
  workspaceFolder: vscode.WorkspaceFolder,
  depth: number
): string[] {
  const folderPath = workspaceFolder.uri.fsPath;
  
  let foundFiles =  searchFiles(folderPath, 0, depth, folderPath); 
  log.traceLog(`Ignored ${totalIgnored} files`);
  console.log(foundFiles);
  return foundFiles;
}

export async function findPixiProjects(searchDepth: number): Promise<Pixi[]> {
  let pixiProjects: Pixi[] = [];
  const workspaceFolders = getWorkspaceFolders();
  const pixiPromises = workspaceFolders.map(async (folder) => {
    const files = getWorkspaceFiles(folder, searchDepth);
    const pixiInfoPromises = files.map(async (file) => {
      const pixi = new Pixi(file);
      const info = await pixi.getPixiInfo();
      if (info && info.project_info) {
        pixiProjects.push(pixi);
      }
    });
    await Promise.all(pixiInfoPromises);
  });
  await Promise.all(pixiPromises);
  return pixiProjects;
}
