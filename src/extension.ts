/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { info, warn, error } from "./common/notification";

import * as log from "./common/logging";
import { getWorkspaceFiles, findPixiProjects } from "./common/filesystem";
import { EXTENSION_NAME } from "./common/constants";
import { createOutputChannel } from "./common/vscode";
import {PixiTaskProvider} from "./taskProvider/pixiTaskProvider";
// import { PixiTaskProvider } from "./taskProvider/pixiTaskProvider";
// import { PixiTaskTreeProvider } from "./treeProvider/task_tree";
import { PixiSearchDepth } from "./config";


const Cache = require("vscode-cache");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Create a new output channel for the extension
  const outputChannel = createOutputChannel(EXTENSION_NAME);
  context.subscriptions.push(outputChannel, log.registerLogger(outputChannel));

  let pixi_projects = await findPixiProjects(PixiSearchDepth);

  // Tell user 
  info(`Found ${pixi_projects.length} pixi projects in workspace`);

  const command = "pixi-vscode.helloWorld";

  const commandHandler = async (name: string = 'world') => {
    let tasks = await vscode.tasks.fetchTasks({type: 'Pixi'});
    console.log(tasks.map(t => t.definition));
  };


  context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));
  // Log the projects
  log.debug(`Extension Activation: Found ${pixi_projects.length} pixi projects:`, pixi_projects);

  let pixiTaskProvider = vscode.tasks.registerTaskProvider("Pixi", new PixiTaskProvider(pixi_projects));
  context.subscriptions.push(pixiTaskProvider);

}

// This method is called when your extension is deactivated
export function deactivate() {}
