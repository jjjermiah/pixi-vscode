// A set of functions to help with file system operations
import * as vscode from "vscode";
import * as path from "path";
import * as log from "./logging";

import { Pixi } from "../managers/pixi";
import { workspace } from "vscode";
import * as config from "../config";

/**
 * Finds Pixi projects within the workspace folders up to a specified search depth.
 * @returns A promise that resolves to an array of Pixi projects.
 */
export async function findPixiProjects(): Promise<Pixi[]> {
	const workspaceFolders = workspace.workspaceFolders ?? [];

	// Process each workspace folder
	const pixiProjects = await Promise.all(
		workspaceFolders.map(async (folder) => {
			const files = await getWorkspaceFiles(folder);

			// Process each file in the folder
			const pixiProjects = await Promise.all(
				files.map((file) => validateAndCreatePixi(file))
			);

			// Filter out undefined results (failed PixiInfo)
			// Filter out any undefined results and type narrow to Pixi[] 
      // - undefined results occur when project validation fails
			return pixiProjects.filter((pixi): pixi is Pixi => pixi !== undefined);
		})
	);

	// Flatten the results from all folders
	return pixiProjects.flat();
}

/**
 * Retrieves all relevant files from a workspace folder up to a specified depth.
 * @param workspaceFolder - The workspace folder to search within.
 * @returns A promise that resolves to an array of file paths.
 */
export async function getWorkspaceFiles(
	workspaceFolder: vscode.WorkspaceFolder,
): Promise<string[]> {
	const folderPath = workspaceFolder.uri.fsPath;
	const includePattern = new vscode.RelativePattern(folderPath, "**/*.{toml}");
	const excludePattern = `{${config.PixiIgnore.join(",")},**/.pixi/**}`;

	const files = await workspace.findFiles(includePattern, excludePattern, undefined);
	const filePaths = files.map(file => file.fsPath);

	log.debug(`getWorkspaceFiles: Found ${filePaths.length} files.`);
	return filePaths;
}

/**
 * Helper function to create a Pixi instance and validate it.
 * @param file - The file path to create a Pixi instance from.
 * @returns A promise that resolves to a Pixi instance or undefined if invalid.
 */
async function validateAndCreatePixi(file: string): Promise<Pixi | undefined> {
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