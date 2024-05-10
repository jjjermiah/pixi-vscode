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

	public async openTerminalAndRunCommand(command: string): Promise<void> {
		const terminal = await this.getActiveTerminal();
		//TODO add config option to show terminal
		//this.terminal.show(this.config.preserveEditorFocus);
		terminal.show();

		await vscode.commands.executeCommand("workbench.action.terminal.clear");
		terminal.sendText(command);

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

// Calls to this class are only made from src/extension.ts
export class PixiExtensionService {
	private vse = new VSCodeExtensionService();
	private pixi_service: PixiService;
	private cache: typeof Cache;

	constructor(cache: typeof Cache) {
		this.cache = cache;
		this.pixi_service = new PixiService(cache);
	}

	async init(uri: vscode.Uri) {
		let pixi_project_dir: vscode.Uri;

		// if we are opening a new folder in the workspace
		let updateWorkspaceFolder = false;

		/**
		 * if : uri is not null, then right-clicked on a folder in explorer
		 * else if : no workspace folders open, then pick a folder and prompt for project name
		 * else : if workspace folders open, then choose one
		 */
		if (uri) {
			pixi_project_dir = uri!;
		} else if (await this.vse.isEmptyWorkspace()) {
			const parent_dir = (await this.vse.openFolder())![0];
			const projectName = await this.vse.promptForProjectName();
			if (!projectName) return;
			pixi_project_dir = vscode.Uri.joinPath(parent_dir, projectName);
			// create a directory
			fs.mkdir(pixi_project_dir.fsPath, { recursive: true }, (err) => {
				if (err) {
					error("Failed to create directory: " + err);
					return;
				}
			});
			info("Created project directory: " + pixi_project_dir.fsPath);
			// after pixi init, open the folder in the current window
			updateWorkspaceFolder = true;
		} else {
			pixi_project_dir = (await this.vse.chooseWorkspaceFolder())!.uri;
		}
		if (!pixi_project_dir) {
			error("Failed to get project directory");
			return;
		}

		let args: string[] = await this.pixi_service.init();
		args.push(pixi_project_dir.fsPath);

		console.log("pixi " + args.join(" "));

		// if (updateWorkspaceFolder) {
		// 	this.vse.openFolderInCurrentWindow(pixi_project_dir.fsPath);
		// }
	}
}
