/* eslint-disable curly */
import * as vscode from "vscode";
import * as fs from "fs";
import { info, warn, error } from "../common/logging";
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
					error("Failed to create directory: " + err);
					return;
				}
			});
			info("Created project directory: " + pixi_project_dir.fsPath);
			// after pixi init, open the folder in the current window
			updateWorkspaceFolder = true;
		} else {
			pixi_project_dir = (await this.vse.chooseWorkspaceFolder())!.uri;
		}
		if (!pixi_project_dir) {
			error("Failed to get project directory");
			return;
		}

		let args: string[] = await this.pixi_service.init();
		args.push(pixi_project_dir.fsPath);

		console.log("pixi " + args.join(" "));

		// if (updateWorkspaceFolder) {
		// 	this.vse.openFolderInCurrentWindow(pixi_project_dir.fsPath);
		// }
	}
}
