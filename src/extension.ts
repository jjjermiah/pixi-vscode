/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { info, warn, error } from "./common/logging";
import { Pixi } from "./environmentManagers/pixi";
import { PixiExtensionService } from "./extensionServices/pixi-extensionservice";
import { PypiService } from "./pypi/pypi-service";
import { PypiClient } from "./pypi/pypi-client";
import { PixiTreeDataProvider } from "./treeProvider/TreeProviderService";

const Cache = require("vscode-cache");

const EXTENSION_NAME = "pixi-vscode";
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const cache = new Cache(context);
	const pypiService = new PypiService(
		context.globalStorageUri,
		PypiClient.default()
	);
	let disposable = vscode.commands.registerCommand(
		"pixi-vscode.helloWorld",
		() => {
			info("Hello World from pixi-vscode!");
		}
	);

	context.subscriptions.push(disposable);

	const pxe = new PixiExtensionService(cache, pypiService);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"pixi-vscode.init",
			async (uri: vscode.Uri) => {
				await pxe.init(uri);
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"pixi-vscode.addChannels",
			async (uri: vscode.Uri) => {
				await pxe.addChannels(uri);
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"pixi-vscode.addPackages",
			async (uri: vscode.Uri) => {
				await pxe.addPackages(uri);
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"pixi-vscode.addPyPiPackages",
			async (uri: vscode.Uri) => {
				await pxe.addPyPiPackages(uri);
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("pixi-vscode.clearCache", async () => {
			cache.flush();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"pixi-vscode.setPythonInterpreter",
			async (uri: vscode.Uri) => {
				await pxe.setPythonInterpreter(uri);
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			"pixi-vscode.activateEnvironmentTerminal",
			async (uri: vscode.Uri) => {
				await pxe.activateEnvironmentTerminal(uri);
			}
		)
	);

	const treeDataProvider = new PixiTreeDataProvider();

	vscode.window.createTreeView("pixi_explorer", {
		treeDataProvider,
		showCollapseAll: true,
	});

	const envsTreeDataProvider = new PixiTreeDataProvider("envs");

	vscode.window.createTreeView("pixi_envs", {
		treeDataProvider: envsTreeDataProvider,
		showCollapseAll: true,
	});

	vscode.commands.registerCommand(
		"pixi-view.openJson",
		(file: vscode.TreeItem) => {
			// // const file_to_open = file.description;
			vscode.commands.executeCommand(
				"vscode.open",
				vscode.Uri.parse(file.value)
			);
		}
	);


}

// This method is called when your extension is deactivated
export function deactivate() {}
