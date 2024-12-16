/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import * as log from "./common/logging";
import { findPixiProjects } from "./common/filesystem";
import { EXTENSION_NAME } from "./common/constants";
import { PixiTaskProvider } from "./taskProvider/pixiTaskProvider";
import { PixiWorkspaceInitializer } from "./initPixiWorkspace";

const Cache = require("vscode-cache");


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Create a new output channel for the extension
	const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME, {
		log: true,
	});

	// Create a new cache instance
	const cache = new Cache(context);

	// Register the output channel and logger
  context.subscriptions.push(outputChannel, log.registerLogger(outputChannel));

	// Find Pixi projects in the workspace
  let pixi_projects = await findPixiProjects();

  // Tell user
  if (pixi_projects.length === 0) {
    // warn("No Pixi projects found in workspace");
    // return;
    log.info("No Pixi projects found in workspace");
  } else {
    log.info(
      `Extension Activation: Found ${pixi_projects.length} pixi projects:`,
      pixi_projects
    );
  }

  // Register the Pixi Task Provider
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      "Pixi",
      new PixiTaskProvider(pixi_projects)
    )
  );

	const workspaceInitializer = new PixiWorkspaceInitializer(cache, pixi_projects);
	// Register the Pixi Init command 
  context.subscriptions.push(
    vscode.commands.registerCommand("pixi-vscode.init", async () => {
			await workspaceInitializer.initPixiWorkspace();
		})
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
