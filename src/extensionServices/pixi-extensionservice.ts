/* eslint-disable curly */
import * as vscode from "vscode";
import * as fs from "fs";
import * as notify from "../common/logging";
import { PixiService } from "./pixi-service";
const Cache = require("vscode-cache");

import { VSCodeExtensionService } from "./vscode-service";

// Calls to this class are only made from src/extension.ts
export class PixiExtensionService {
	private vse = new VSCodeExtensionService();
	private pixi_service: PixiService;
	private cache: typeof Cache;

	constructor(cache: typeof Cache) {
		this.cache = cache;
		this.pixi_service = new PixiService(cache);
	}

	/**
	 * Initialize a new Pixi project through extension
	 *
	 * @param uri - the uri of the folder to initialize the project in
	 * @returns 		- void
	 */
	async init(uri: vscode.Uri) {
		// if we are opening a new folder in the workspace
		// let updateWorkspaceFolder = false;
		let pixiProject: {
			projectDir: vscode.Uri;
			updateWorkspaceFolder: boolean;
		} = await this.getPixiProjectDir(uri, true);
		if (!pixiProject.projectDir) return; // if user cancels the prompt

		let args: string[] = await this.pixi_service.init();
		if (!args) return; // if user cancels the prompt

		if (pixiProject.updateWorkspaceFolder) {
			try {
				// create a directory
				await fs.promises.mkdir(pixiProject.projectDir.fsPath, {
					recursive: true,
				});
				notify.info(
					"Created project directory: " +
						pixiProject.projectDir.fsPath
				);
				this.vse.openFolderInCurrentWindow(
					pixiProject.projectDir.fsPath
				);
			} catch (err) {
				notify.error("Failed to create directory: " + err);
				return;
			}
		}
		// add the directory to the args
		args.push(pixiProject.projectDir.fsPath);
		const commandResults = await this.vse.runPixiCommand(args);

		// TODO clean this section up. This is a workaround to check if the init worked
		if (commandResults) {
			// sleep for 2 seconds to allow the manifest file to be created

			await new Promise((resolve) => setTimeout(resolve, 2000));

			notify.info("Pixi project initialized successfully");
			// Test if the init worked by looking for the manifest file
			const manifestPath = await this.findManifestFile(
				pixiProject.projectDir.fsPath
			);
			if (!manifestPath) {
				notify.error("Init: something went wrong");
				return;
			}
		}
	}

	/**
	 * Adds channels to the workspace based on the provided URI.
	 * If the workspace is empty, an error notification is shown.
	 * The method retrieves the Pixi project directory from the URI and finds the manifest file.
	 * It then gets the existing channels from the manifest file and prompts the user to add a new channel.
	 * Finally, it runs the Pixi command with the updated arguments.
	 *
	 * @param uri - The URI of the file or folder in the workspace.
	 * @returns void
	 */
	async addChannels(uri: vscode.Uri) {
		if (await this.vse.isEmptyWorkspace()) {
			notify.error("No workspace folders open");
			return;
		}

		const pixiProject = await this.getPixiProjectDir(uri);
		if (!pixiProject.projectDir) return; // if user cancels the prompt

		const manifestPath = await this.findManifestFile(
			pixiProject.projectDir.fsPath
		);

		const existingChannels = await this.pixi_service.getChannels(
			manifestPath
		);
		const args = await this.pixi_service.addChannel(existingChannels);

		args.push(`--manifest-path ${manifestPath}`);
		console.log("pixi " + args.join(" "));
		this.vse.runPixiCommand(args);
	}

	/**
	 * Adds packages to the Pixi project located at the specified URI.
	 * If no URI is provided, it prompts the user to choose a workspace folder.
	 *
	 * @param uri - The URI of the Pixi project directory.
	 */
	async addPackages(uri: vscode.Uri) {
		const pixi_project_dir =
			uri || (await this.vse.chooseWorkspaceFolder())!.uri;

		const manifestPath = await this.findManifestFile(
			pixi_project_dir.fsPath
		);
		const args = await this.pixi_service.addPackages();

		const features = await this.pixi_service.getEnvironmentFeatures(
			manifestPath
		);
		if (!features) {
			console.log("No features found");
		}

		const chosenFeatures = await this.pixi_service.showQuickPick({
			title: "Feature to add packages to",
			items: features!.map((feature) => ({
				label: feature,
				description: "",
			})),
			placeholder: "Select a feature",
			canSelectMany: false,
			selectedItems: [{ label: "default", description: "" }],
		});
		const feature = chosenFeatures ? chosenFeatures[0] : "default";
		if (feature !== "default") {
			args.push(`--feature ${feature}`);
		}

		args.push(`--manifest-path ${manifestPath}`);

		console.log("pixi " + args.join(" "));
		this.vse.runPixiCommand(args);
	}

	/**
	 * Get the Pixi project directory
	 *
	 * @param uri - the uri of the folder to initialize the project in
	 * @param updateWorkspaceFolder - boolean to update the workspace folder
	 * @returns - the project directory and a boolean to update the workspace folder
	 *
	 * @description
	 *	LOGIC: Determine the project directory based on the uri and workspace folders
	 *
	 * 	if : uri is not null, then user must've right-clicked on a folder in explorer
	 * 	else if : no workspace folders open, then pick a system folder and prompt for
	 * 						project name
	 * 	else : if workspace folders open, then choose one of them
	 */
	private async getPixiProjectDir(
		uri: vscode.Uri,
		updateWorkspaceFolder?: boolean
	): Promise<{
		projectDir: vscode.Uri;
		updateWorkspaceFolder: boolean;
	}> {
		if (uri) {
			return { projectDir: uri, updateWorkspaceFolder: false };
		} else if (await this.vse.isEmptyWorkspace()) {
			// if theres no updateWorkspaceFolder variable, then error out and return
			if (updateWorkspaceFolder === undefined) {
				notify.error("No workspace folders open");
				return {
					projectDir: vscode.Uri.parse(""),
					updateWorkspaceFolder: false,
				};
			}

			const parent_dir = (await this.vse.openFolder())![0];
			const projectName = await this.vse.promptForProjectName();
			if (!projectName)
				return {
					projectDir: vscode.Uri.parse(""),
					updateWorkspaceFolder: false,
				};

			return {
				projectDir: vscode.Uri.joinPath(parent_dir, projectName),
				// true so that after pixi init, open the chosen folder in the current window
				updateWorkspaceFolder: true,
			};
		} else {
			return {
				projectDir: (await this.vse.chooseWorkspaceFolder())!.uri,
				updateWorkspaceFolder: false,
			};
		}
	}

	async findManifestFile(pixi_project_dir: string) {
		return (
			(await this.pixi_service.findProjectFile(pixi_project_dir)) || ""
		);
	}
}
