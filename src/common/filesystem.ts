// a set of functions to help with file system operations

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function getWorkspaceFiles(workspaceFolder: vscode.WorkspaceFolder, depth: number): string[] {
  const files: string[] = [];
  const folderPath = workspaceFolder.uri.fsPath;

  function searchFiles(currentPath: string, currentDepth: number) {
    if (currentDepth > depth) return;

    const contents = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const item of contents) {
      if (item.isDirectory()) {
        searchFiles(path.join(currentPath, item.name), currentDepth + 1);
      } else if (item.isFile() && (item.name === "pixi.toml" || item.name === "pyproject.toml")) {
        files.push(path.join(currentPath, item.name));
      }
    }
  }

  searchFiles(folderPath, 0);
  return files;
}