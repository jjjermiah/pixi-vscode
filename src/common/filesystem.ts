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
  
  let foundFiles = searchFiles(folderPath, 0, depth, folderPath); 
  log.debug(`getWorkspaceFiles: Found ${foundFiles.length} files and ignored ${totalIgnored} files.`);
  return foundFiles;
}

export async function findPixiProjects(searchDepth: number): Promise<Pixi[]> {
	const workspaceFolders = getWorkspaceFolders();

	// Process each workspace folder
	const pixiProjects = await Promise.all(
		workspaceFolders.map((folder) => findPixiProjectsInFolder(folder, searchDepth))
	);

	// Flatten the results from all folders
	return pixiProjects.flat();
}

// Helper function to process one folder
async function findPixiProjectsInFolder(folder: vscode.WorkspaceFolder, searchDepth: number): Promise<Pixi[]> {
	const files = getWorkspaceFiles(folder, searchDepth);

	// Process each file in the folder
	const pixiProjects = await Promise.all(
		files.map((file) => createPixiIfValid(file))
	);

	// Filter out undefined results (failed PixiInfo)
	return pixiProjects.filter((pixi): pixi is Pixi => pixi !== undefined);
}

// Helper function to create a Pixi instance if valid
async function createPixiIfValid(file: string): Promise<Pixi | undefined> {
	try {
		const pixi = new Pixi(file);
		await pixi.getPixiInfo(); // Ensure PixiInfo is loaded
		if (pixi.pixiInfo.project_info) {
      await pixi.getPixiTaskEnvironments();
      return pixi;
		}
	} catch (error) {
		log.error(`Failed to get PixiInfo for ${file}`, error);
	}
	return undefined;
}