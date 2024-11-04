/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { info, warn, error } from "./common/notification";
import {
  registerLogger,
  traceError,
  traceLog,
  traceVerbose,
} from "./common/logging";
import { getWorkspaceFiles, findPixiProjects } from "./common/filesystem";
import { EXTENSION_NAME } from "./common/constants";
import { createOutputChannel } from "./common/vscode";
import { PixiTaskProvider } from "./taskProvider/pixiTaskProvider";
import { PixiTaskTreeProvider } from "./treeProvider/task_tree";
import { PixiSearchDepth } from "./config";

const Cache = require("vscode-cache");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Create a new output channel for the extension
  const outputChannel = createOutputChannel(EXTENSION_NAME);
  context.subscriptions.push(outputChannel, registerLogger(outputChannel));

  let pixi_projects = await findPixiProjects(PixiSearchDepth);

  const EMPTY_WORKSPACE = pixi_projects.length === 0;

  info(`Found ${pixi_projects.length} pixi projects in workspace`);

  traceLog(`Num pixi projects: ${pixi_projects.length}`);

  let pixiTaskProvider = new PixiTaskProvider(pixi_projects);

  context.subscriptions.push(
    vscode.tasks.registerTaskProvider("Pixi", pixiTaskProvider)
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "pixi_explorer",
      new PixiTaskTreeProvider()
    )
  );

  // Register a command handler
  context.subscriptions.push(
    vscode.commands.registerCommand("pixi-vscode.helloWorld", () => {
      outputChannel.appendLine("Hello, World!");
    })
  );

  // Register a command handler
  context.subscriptions.push(
    vscode.commands.registerCommand("pixi-vscode.logs", () => {
      info("Hello, World!");
      warn("Hello, World warning!");
      error("Hello, World error!");
      traceLog("Hello, World log!");
      traceVerbose("Hello, World verbose!");
      traceError("Hello, World error!");
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
