/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { info, warn, error } from "./common/logging";
import { Pixi } from "./environmentManagers/pixi";
import { PixiExtensionService } from "./extensionServices/pixi-extensionservice";
const Cache = require("vscode-cache");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const cache = new Cache(context);

	let disposable = vscode.commands.registerCommand(
		"pixi-vscode.helloWorld",
		() => {
			info("Hello World from pixi-vscode!");
		}
	);

	context.subscriptions.push(disposable);

	const pxe = new PixiExtensionService(cache);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"pixi-vscode.init",
			async (uri: vscode.Uri) => {
				await pxe.init(uri);
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("pixi-vscode.clearCache", async () => {
			cache.flush();
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
