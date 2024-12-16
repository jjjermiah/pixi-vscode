/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { info, warn, error } from "./common/notification";

import * as log from "./common/logging";
import {findPixiProjects } from "./common/filesystem";
import { EXTENSION_NAME } from "./common/constants";
import { createOutputChannel } from "./common/vscode";
import {PixiTaskProvider} from "./taskProvider/pixiTaskProvider";
import { PixiExtensionService } from "./extensionServices/pixi-extensionservice";
// import { PixiTaskProvider } from "./taskProvider/pixiTaskProvider";
import { initPixiWorkspace } from "./initPixiWorkspace";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Create a new output channel for the extension
  const outputChannel = vscode
		.window
		.createOutputChannel(EXTENSION_NAME, { log: true });

  context.subscriptions.push(outputChannel, log.registerLogger(outputChannel));

  let pixi_projects = await findPixiProjects();

  // Tell user
	if (pixi_projects.length === 0) {
		// warn("No Pixi projects found in workspace");
		return;
	}

	// Log the projects
	log.info(`Extension Activation: Found ${pixi_projects.length} pixi projects:`, pixi_projects);
	
	// Register the Pixi Task Provider
  let pixiTaskProvider = vscode.tasks.registerTaskProvider("Pixi", new PixiTaskProvider(pixi_projects));
  context.subscriptions.push(pixiTaskProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"pixi-vscode.init",
			await initPixiWorkspace()
		)
	);
}


