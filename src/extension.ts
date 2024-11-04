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
import { getWorkspaceFiles } from "./common/filesystem";
import { EXTENSION_NAME } from "./common/constants";
import { getWorkspaceFolders, createOutputChannel } from "./common/vscode";
import { Pixi } from "./managers/pixi";

const SEARCHDEPTH = 3;

async function findPixiProjects(searchDepth: number): Promise<Pixi[]> {
  let pixiProjects: Pixi[] = [];
  const workspaceFolders = getWorkspaceFolders();
  const pixiPromises = workspaceFolders.map(async (folder) => {
    const files = await getWorkspaceFiles(folder, searchDepth);
    const pixiInfoPromises = files.map(async (file) => {
      const pixi = new Pixi(file);
      const info = await pixi.getPixiInfo();
      if (info && info.project_info) {
        pixiProjects.push(pixi);
      }
    });
    await Promise.all(pixiInfoPromises);
  });
  await Promise.all(pixiPromises);
  return pixiProjects;
}

const Cache = require("vscode-cache");


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Create a new output channel for the extension
  const outputChannel = createOutputChannel(EXTENSION_NAME);
  context.subscriptions.push(outputChannel, registerLogger(outputChannel));

  let pixi_projects = await findPixiProjects(SEARCHDEPTH);

  traceLog(`Num pixi projects: ${pixi_projects.length}`);
  pixi_projects.forEach((pixi) => {
    pixi.getPixiInfo().then((info) => {
      traceLog(`Pixi Project Name: ${info.project_info.name}`);
    });
  });

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
