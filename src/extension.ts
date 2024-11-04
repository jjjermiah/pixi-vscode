/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { info, warn, error, } from "./common/notification";
import { registerLogger, traceError, traceLog, traceVerbose } from './common/logging';
import { getWorkspaceFiles } from "./common/filesystem";
import { EXTENSION_NAME } from "./common/constants";
import {
  getWorkspaceFolders,
  getConfiguration,
  getWorkspaceFolder,
  createOutputChannel,
} from "./common/vscode";
import { all } from "axios";

const SEARCHDEPTH = 3;

const Cache = require("vscode-cache");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


  // Create a new output channel for the extension
  const outputChannel = createOutputChannel(EXTENSION_NAME);
  context.subscriptions.push(outputChannel, registerLogger(outputChannel));

  let workspaceFolders = getWorkspaceFolders();

  let allPixiWorkspaceFolders: string[] = [];

  workspaceFolders.forEach(folder => {
    allPixiWorkspaceFolders.push(...getWorkspaceFiles(folder, SEARCHDEPTH));
  });


  traceLog("Pixi workspace folders:", allPixiWorkspaceFolders);

  // Register a command handler
  const disposable = vscode.commands.registerCommand("pixi-vscode.helloWorld", () => {
    outputChannel.appendLine("Hello, World!");
  });
  context.subscriptions.push(disposable);

  // Register a command handler
  const disposable2 = vscode.commands.registerCommand("pixi-vscode.logs", () => {
    info("Hello, World!");
    warn("Hello, World warning!");
    error("Hello, World error!");
    traceLog("Hello, World log!");
    traceVerbose("Hello, World verbose!");
    traceError("Hello, World error!");
  });
  context.subscriptions.push(disposable2);


}

// This method is called when your extension is deactivated
export function deactivate() { }
