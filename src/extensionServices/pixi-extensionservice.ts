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

		// create a directory
		if (pixiProject.updateWorkspaceFolder) {
			fs.mkdir(
				pixiProject.projectDir.fsPath,
				{ recursive: true },
				(err) => {
					if (err) {
						notify.error("Failed to create directory: " + err);
						return;
					}
				}
			);
			notify.info(
				"Created project directory: " + pixiProject.projectDir.fsPath
			);

			this.vse.openFolderInCurrentWindow(pixiProject.projectDir.fsPath);
		}
		// add the directory to the args
		args.push(pixiProject.projectDir.fsPath);

		if (await this.vse.runPixiCommand(args)) {
			notify.info("Pixi project initialized successfully");
			// Test if the init worked by looking for the manifest file
			const manifestPath = await this.findManifestFile(
				pixiProject.projectDir.fsPath
			);
			if (manifestPath === "") {
				notify.error("Init: something went wrong");
			}
		}
	}

	async addChannels(uri: vscode.Uri) {
		if (await this.vse.isEmptyWorkspace()) {
			notify.error("No workspace folders open");
			return;
		}
		let pixiProject: {
			projectDir: vscode.Uri;
			updateWorkspaceFolder: boolean;
		} = await this.getPixiProjectDir(uri);
		if (!pixiProject.projectDir) return; // if user cancels the prompt

		const manifestPath = await this.findManifestFile(
			pixiProject.projectDir.fsPath
		);

		const args: string[] = await this.pixi_service
			.getChannels(manifestPath)
			.then((existing_channels) => {
				return this.pixi_service.addChannel(existing_channels);
			});

		args.push(`--manifest-path ${manifestPath}`);
		console.log("pixi " + args.join(" "));
		this.vse.runPixiCommand(args);
	}

	async addPackages(uri: vscode.Uri) {
		let pixi_project_dir: vscode.Uri;
		if (uri) {
			pixi_project_dir = uri;
		} else if (await this.vse.isEmptyWorkspace()) {
			notify.error("No workspace folders open");
			return;
		} else {
			pixi_project_dir = (await this.vse.chooseWorkspaceFolder())!.uri;
		}

		const manifestPath = await this.findManifestFile(
			pixi_project_dir.fsPath
		);
		const args = await this.pixi_service.addPackages();
		// if user wants to add to a specific environment
		const feature = await this.pixi_service
			.getEnvironmentFeatures(manifestPath)
			.then((features) => {
				if (!features) console.log("No features found");
				return this.pixi_service.showQuickPick({
					title: "Feature to add packages to",
					items: features!.map((feature) => {
						return { label: feature, description: "" };
					}),
					placeholder: "Select a feature",
					canSelectMany: false,
					selectedItems: [
						{
							label: "default",
							description: "",
						},
					],
				});
			});
		if (feature) {
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
