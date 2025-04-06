/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
// import { getEnvExtApi } from "./pythonEnvsApi";
import { registerLogger } from "./common/logging";
import { EXTENSION_NAME } from "./common/constants";
import { findPixiProjects } from "./managers/pixi_finder";
import { Pixi } from "./managers/pixiAPI";
// import { PixiPackageManager } from "./managers/pixiPackageManager";
// import { PixiEnvironmentManager } from "./managers/pixiEnvironmentManager";
import * as log from "./common/logging";
// import { PixiTaskProvider } from "./taskProvider/pixiTaskProvider";
// import { PixiWorkspaceInitializer } from "./initPixiWorkspace";

const Cache = require("vscode-cache");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  /// ---------------------------------------------------------------------------------------------
  // Create a Log output channel
  const outputChannel: vscode.LogOutputChannel =
    vscode.window.createOutputChannel(EXTENSION_NAME, { log: true });
  context.subscriptions.push(outputChannel, registerLogger(outputChannel));

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "pixi-vscode2.viewLogs",
      outputChannel.show.bind(outputChannel)
    ),
    vscode.commands.registerCommand(
      "pixi-vscode2.clearLogs",
      outputChannel.clear.bind(outputChannel)
    )
  );
  /// ---------------------------------------------------------------------------------------------

  // Create a new cache instance
  const cache = new Cache(context);

  // Find Pixi projects in the workspace
  let pixi_projects = await findPixiProjects();
  log.info(`Extension Activation: Found ${pixi_projects.length} pixi projects`);

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
  /// ---------------------------------------------------------------------------------------------
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "pixi-vscode2.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from pixi-vscode2!");
    }
  );

  context.subscriptions.push(disposable);

  // // Register the Pixi Task Provider
  // context.subscriptions.push(
  //   vscode.tasks.registerTaskProvider(
  //     "Pixi",
  //     new PixiTaskProvider(pixi_projects)
  //   )
  // );

  // const workspaceInitializer = new PixiWorkspaceInitializer(
  //   cache,
  //   pixi_projects
  // );
  // Register the Pixi Init command
  // context.subscriptions.push(
  //   vscode.commands.registerCommand("pixi-vscode.init", async () => {
  //     await workspaceInitializer.initPixiWorkspace();
  //   })
  // );
}

// This method is called when your extension is deactivated
export function deactivate() {}
