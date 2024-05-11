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

	async init(uri: vscode.Uri) {
		let pixi_project_dir: vscode.Uri;

		// if we are opening a new folder in the workspace
		let updateWorkspaceFolder = false;

		/**
		 * if : uri is not null, then right-clicked on a folder in explorer
		 * else if : no workspace folders open, then pick a folder and prompt for project name
		 * else : if workspace folders open, then choose one
		 */
		if (uri) {
			pixi_project_dir = uri!;
		} else if (await this.vse.isEmptyWorkspace()) {
			const parent_dir = (await this.vse.openFolder())![0];
			const projectName = await this.vse.promptForProjectName();
			if (!projectName) return;
			pixi_project_dir = vscode.Uri.joinPath(parent_dir, projectName);
			// create a directory
			fs.mkdir(pixi_project_dir.fsPath, { recursive: true }, (err) => {
				if (err) {
					notify.error("Failed to create directory: " + err);
					return;
				}
			});
			notify.info(
				"Created project directory: " + pixi_project_dir.fsPath
			);

			// after pixi init, open the folder in the current window
			updateWorkspaceFolder = true;
		} else {
			pixi_project_dir = (await this.vse.chooseWorkspaceFolder())!.uri;
		}
		if (!pixi_project_dir) {
			notify.error("Failed to get project directory");
			return;
		}

		let args: string[] = await this.pixi_service.init();
		args.push(pixi_project_dir.fsPath);

		console.log("pixi " + args.join(" "));

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

	async findManifestFile(pixi_project_dir: string) {
		return (
			(await this.pixi_service.findProjectFile(pixi_project_dir)) || ""
		);
	}
}
