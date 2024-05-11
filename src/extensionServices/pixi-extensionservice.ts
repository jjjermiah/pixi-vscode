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
		// The folder to initialize the project in

		let pixi_project_dir: vscode.Uri;

		// if we are opening a new folder in the workspace

		let updateWorkspaceFolder = false;

		/**
		 * LOGIC:
		 * if : uri is not null, then right-clicked on a folder in explorer
		 * else if : no workspace folders open, then choose a folder and prompt for
		 * 						project name
		 * else : if workspace folders open, then choose one
		 */
		if (uri) {
			pixi_project_dir = uri!;
		} else if (await this.vse.isEmptyWorkspace()) {
			const parent_dir = (await this.vse.openFolder())![0];
			const projectName = await this.vse.promptForProjectName();
			if (!projectName) return;
			pixi_project_dir = vscode.Uri.joinPath(parent_dir, projectName);

			// true so that after pixi init, open the chosen folder in the current window
			updateWorkspaceFolder = true;
		} else {
			pixi_project_dir = (await this.vse.chooseWorkspaceFolder())!.uri;
		}
		if (!pixi_project_dir) {
			notify.error("PXS init: Failed to get project directory");
			return;
		}

		let args: string[] = await this.pixi_service.init();
		if (!args) {
			notify.error("PXS init: Failed to get init args");
			return;
		}
		args.push(pixi_project_dir.fsPath);

		// create a directory
		fs.mkdir(pixi_project_dir.fsPath, { recursive: true }, (err) => {
			if (err) {
				notify.error("Failed to create directory: " + err);
				return;
			}
		});
		notify.info("Created project directory: " + pixi_project_dir.fsPath);

		if (updateWorkspaceFolder) {
			this.vse.openFolderInCurrentWindow(pixi_project_dir.fsPath);
		}

		this.vse.openTerminalAndRunCommand("pixi " + args.join(" "));

		const manifestPath = await this.findManifestFile(
			pixi_project_dir.fsPath
		);
		if (manifestPath === "") {
			notify.error("Init: something went wrong");
		}
	}

	async addChannels(uri: vscode.Uri) {
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

		const args: string[] = await this.pixi_service
			.getChannels(manifestPath)
			.then((channels) => {
				return this.pixi_service.addChannel(channels);
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
	}

	async findManifestFile(pixi_project_dir: string) {
		return (
			(await this.pixi_service.findProjectFile(pixi_project_dir)) || ""
		);
	}
}
