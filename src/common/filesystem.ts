// a set of functions to help with file system operations

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as ignore from "ignore";

export function getWorkspaceFiles(
  workspaceFolder: vscode.WorkspaceFolder,
  depth: number
): string[] {
  const files: string[] = [];
  const folderPath = workspaceFolder.uri.fsPath;

  const gitignorePath = path.join(folderPath, ".gitignore");
  const gitignore = ignore.default();

  if (fs.existsSync(gitignorePath)) {
    const gitignoreContents = fs.readFileSync(gitignorePath, "utf8");
    gitignore.add(gitignoreContents);
  }

  function searchFiles(currentPath: string, currentDepth: number) {
    if (currentDepth > depth) return;

    const contents = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const item of contents) {
      const itemPath = path.join(currentPath, item.name);

      if (gitignore.ignores(path.relative(folderPath, itemPath))) continue;

      if (item.isDirectory()) {
        searchFiles(itemPath, currentDepth + 1);
      } else if (
        item.isFile() &&
        (item.name === "pixi.toml" || item.name === "pyproject.toml")
      ) {
        files.push(itemPath);
      }
    }
  }

  searchFiles(folderPath, 0);
  return files;
}
