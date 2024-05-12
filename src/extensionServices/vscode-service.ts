/* eslint-disable curly */
import * as vscode from "vscode";
import * as fs from "fs";
import { info, warn, error } from "../common/logging";
import { PixiService } from "./pixi-service";
import { Pixi } from "../environmentManagers/pixi";
import { PixiCommand } from "../enums";
const Cache = require("vscode-cache");

export class VSCodeExtensionService {
	constructor() {}

	public async setDefaultPythonInterpreter(pythonPath: string) {
		await vscode.workspace
			.getConfiguration()
			.update(
				"python.defaultInterpreterPath",
				pythonPath,
				vscode.ConfigurationTarget.Workspace
			);
	}

	public async activeTextEditors(): Promise<vscode.TextEditor[] | undefined> {
		return vscode.window.visibleTextEditors as vscode.TextEditor[];
	}

	public async isEmptyWorkspace(): Promise<boolean> {
		return !vscode.workspace.workspaceFolders;
	}

	public async activeWorkspaceFolders(): Promise<
		vscode.WorkspaceFolder[] | undefined
	> {
		return vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[];
	}

	// ask user to choose from a workspace folder to open
	public async chooseWorkspaceFolder(): Promise<
		vscode.WorkspaceFolder | undefined
	> {
		if (await this.isEmptyWorkspace()) return undefined;

		const folders = await this.activeWorkspaceFolders();

		if (folders && folders.length === 1) return folders[0];

		return await vscode.window.showWorkspaceFolderPick();
	}

	// ask user to choose a folder to open
	public async openFolder(): Promise<vscode.Uri[] | undefined> {
		return await vscode.window.showOpenDialog({
			openLabel: "Initialize New Pixi Project in: ",
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
		});
	}

	// A function to open a folder in the current window
	public async openFolderInCurrentWindow(folder: string): Promise<void> {
		vscode.commands.executeCommand(
			"vscode.openFolder",
			vscode.Uri.file(folder),
			false
		);
	}

	public async runPixiCommand(args: string[]): Promise<boolean | undefined> {
		try {
			const command: string = PixiCommand.tool + " " + args.join(" ");
			console.log("Running Pixi command: " + command);
			return await this.openTerminalAndRunCommand(command);
		} catch (e) {
			error("Error running Pixi command: " + e);
		}
	}

	public async openTerminalAndRunCommand(command: string): Promise<boolean> {
		const terminal = await this.getActiveTerminal();
		//TODO add config option to show terminal
		//this.terminal.show(this.config.preserveEditorFocus);
		terminal.show();

		await vscode.commands.executeCommand("workbench.action.terminal.clear");
		terminal.sendText(command);
		// Return true if command was successful
		return true;
		// terminal.dispose();
	}

	private async getActiveTerminal(): Promise<vscode.Terminal> {
		return (
			vscode.window.activeTerminal ||
			vscode.window.createTerminal({
				name: "Pixi Terminal",
				hideFromUser: false,
			})
		);
	}

	// unsure where to put this function ... only used during init
	async promptForProjectName(): Promise<string | undefined> {
		const inputBox = vscode.window.createInputBox();
		inputBox.title = "Enter Project Name";
		inputBox.placeholder = "Enter a project name.";
		inputBox.show();
		const projectName = await new Promise<string>((resolve) => {
			inputBox.onDidAccept(() => {
				resolve(inputBox.value);
				inputBox.dispose();
			});
		});
		return projectName;
	}
}
