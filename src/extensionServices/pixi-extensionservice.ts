/* eslint-disable curly */
import * as vscode from "vscode";
import * as fs from "fs";
import * as notify from "../common/logging";
import { PixiService } from "./pixi-service";
const Cache = require("vscode-cache");
import {
	EnvironmentPath,
	PythonExtension,
	ResolvedEnvironment,
} from "@vscode/python-extension";
import { VSCodeExtensionService } from "./vscode-service";
import { PypiClient, PypiService } from "../pypi";

// Calls to this class are only made from src/extension.ts
export class PixiExtensionService {
	private vse = new VSCodeExtensionService();
	private pixi_service: PixiService;
	private cache: typeof Cache;

	constructor(cache: typeof Cache, pypiService: PypiService) {
		this.cache = cache;
		this.pixi_service = new PixiService(cache, pypiService);
	}

	/**
	 * Initialize a new Pixi project through extension
	 *
	 * @param uri - the uri of the folder to initialize the project in
	 * @returns 		- void
	 */
	async init(uri: vscode.Uri) {
		// if we are opening a new folder in the workspace
		// let updateWorkspaceFolder = false;
		let pixiProject: {
			projectDir: vscode.Uri;
			updateWorkspaceFolder: boolean;
		} = await this.getPixiProjectDir(uri);
		if (!pixiProject.projectDir) return; // if user cancels the prompt

		let args: string[] = await this.pixi_service.init();
		if (!args) return; // if user cancels the prompt

		// TODO convert this to a function
		// Only when initializing a new project, we need to update the workspace
		// if the user chooses to open a new folder in the current window
		if (pixiProject.updateWorkspaceFolder) {
			try {
				// TODO I actually dont think we need to create a directory, pixi init should do that
				// create a directory
				await fs.promises.mkdir(pixiProject.projectDir.fsPath, {
					recursive: true,
				});
				notify.info(
					"Created project directory: " + pixiProject.projectDir.fsPath
				);
			} catch (err) {
				notify.error("Failed to create directory: " + err);
				return;
			}
		}
		// add the directory to the args
		args.push(pixiProject.projectDir.fsPath);
		const commandResults = await this.vse.runPixiCommand(args);

		// TODO clean this section up. This is a workaround to check if the init worked
		if (commandResults) {
			console.log("command results: " + commandResults);
			await new Promise((resolve) => setTimeout(resolve, 1000));
			if (pixiProject.updateWorkspaceFolder) {
				this.vse.openFolderInCurrentWindow(pixiProject.projectDir.fsPath);
			}
			notify.info("Pixi project initialized successfully");
			// Test if the init worked by looking for the manifest file
			const manifestPath = await this.findManifestFile(
				pixiProject.projectDir.fsPath
			);
			if (!manifestPath) {
				notify.error("Init: something went wrong");
				return;
			}
		}
	}

	/**
	 * Adds channels to the workspace based on the provided URI.
	 * If the workspace is empty, an error notification is shown.
	 * The method retrieves the Pixi project directory from the URI and finds the manifest file.
	 * It then gets the existing channels from the manifest file and prompts the user to add a new channel.
	 * Finally, it runs the Pixi command with the updated arguments.
	 *
	 * @param uri - The URI of the file or folder in the workspace.
	 * @returns void
	 */
	async addChannels(uri: vscode.Uri) {
		if (await this.vse.isEmptyWorkspace()) {
			notify.error("No workspace folders open");
			return;
		}

		const pixiProject = await this.getPixiProjectDir(uri);
		if (!pixiProject.projectDir) return; // if user cancels the prompt

		const manifestPath = await this.findManifestFile(
			pixiProject.projectDir.fsPath
		);

		const existingChannels = await this.pixi_service.getChannels(manifestPath);
		const args = await this.pixi_service.addChannel(existingChannels);

		args.push(`--manifest-path ${manifestPath}`);
		console.log("pixi " + args.join(" "));
		this.vse.runPixiCommand(args);
	}

	/**
	 * Adds packages to the Pixi project located at the specified URI.
	 * If no URI is provided, it prompts the user to choose a workspace folder.
	 *
	 * @param uri - The URI of the Pixi project directory.
	 */
	async addPackages(uri: vscode.Uri) {
		const pixi_project_dir =
			uri || (await this.vse.chooseWorkspaceFolder())!.uri;

		const manifestPath = await this.findManifestFile(pixi_project_dir.fsPath);
		const args = await this.pixi_service.addPackages();

		const features = await this.pixi_service.getEnvironmentFeatures(
			manifestPath
		);
		if (!features) {
			console.log("No features found");
		}

		const chosenFeatures = await this.pixi_service.showQuickPick({
			title: "Feature to add packages to",
			items: features!.map((feature) => ({
				label: feature,
				description: "",
			})),
			placeholder: "Select a feature",
			canSelectMany: false,
			selectedItems: [{ label: "default", description: "" }],
		});
		const feature = chosenFeatures ? chosenFeatures[0] : "default";
		if (feature !== "default") {
			args.push(`--feature ${feature}`);
		}

		args.push(`--manifest-path ${manifestPath}`);

		console.log("pixi " + args.join(" "));
		this.vse.runPixiCommand(args);
	}

	async addPyPiPackages(uri: vscode.Uri) {
		const pixi_project_dir =
			uri || (await this.vse.chooseWorkspaceFolder())!.uri;

		const manifestPath = await this.findManifestFile(pixi_project_dir.fsPath);

		// for each package, the arg is "--pypi <package-name>"
		const args = await this.pixi_service.addPyPiPackages();
		if (!args) {
			console.log("No packages found");
			return;
		}

		const features = await this.pixi_service.getEnvironmentFeatures(
			manifestPath
		);
		if (!features) {
			console.log("No features found");
		}

		const chosenFeatures = await this.pixi_service.showQuickPick({
			title: "Feature to add packages to",
			items: features!.map((feature) => ({
				label: feature,
				description: "",
			})),
			placeholder: "Select a feature",
			canSelectMany: false,
			selectedItems: [{ label: "default", description: "" }],
		});
		const feature = chosenFeatures ? chosenFeatures[0] : "default";
		if (feature !== "default") {
			args.push(`--feature ${feature}`);
		}

		args.push(`--manifest-path ${manifestPath}`);

		console.log("pixi " + args.join(" "));
		this.vse.runPixiCommand(args);
	}

	async setPythonInterpreter(uri: vscode.Uri) {
		if (await this.vse.isEmptyWorkspace()) {
			notify.error("No workspace folders open");
			return;
		}
		const pixiProject = await this.getPixiProjectDir(uri);
		if (!pixiProject.projectDir) return; // if user cancels the prompt

		const manifestPath = await this.findManifestFile(
			pixiProject.projectDir.fsPath
		);
		const envs = await this.pixi_service.getEnvironmentInfo(manifestPath);
		if (!envs) {
			notify.error("No environments found");
			return;
		}

		// TODO refactor this... it's a bit messy
		const items: vscode.QuickPickItem[] = await Promise.all(
			envs.map(async (env: any) => ({
				label: env.name,
				description: await this.pixi_service.pixi.getPythonInterpreterPath(env),
				detail: env.dependencies.join(", "),
			}))
		);

		const selectedEnv = await this.pixi_service.showQuickPick({
			title: "Select Environment",
			items: items,
			placeholder: "Select an environment",
			canSelectMany: false,
		});
		if (!selectedEnv) return;

		const selectedPythonEnv = envs.find(
			(env: any) => env.name === selectedEnv[0]
		);
		if (!selectedPythonEnv) return;
		console.log(`Selected Python Path: ${selectedPythonEnv.name}`);

		const selectedPythonPath =
			await this.pixi_service.pixi.getPythonInterpreterPath(selectedPythonEnv);
		// check if the selected python path is valid and exists
		if (!fs.existsSync(selectedPythonPath)) {
			notify.error(
				`Python interpreter path does not exist: ${selectedPythonPath}` +
				`\nYou might need to pixi install -e ${selectedPythonEnv.name}`
			);
			return;
		}

		this.vse
			.setPythonInterpreterPath(selectedPythonPath)
			.then((env: ResolvedEnvironment | undefined) => {
				if (!env) {
					notify.error("Failed to set Python interpreter");
					return;
				}
				notify.info(`Python interpreter set to ${env.path}`);
			});
	}

	async activateEnvironmentTerminal(uri: vscode.Uri) {
		if (await this.vse.isEmptyWorkspace()) {
			notify.error("No workspace folders open");
			return;
		}
		const pixiProject = await this.getPixiProjectDir(uri);
		if (!pixiProject.projectDir) return; // if user cancels the prompt

		const manifestPath = await this.findManifestFile(
			pixiProject.projectDir.fsPath
		);
		const envs = await this.pixi_service.getEnvironmentInfo(manifestPath);
		if (!envs) {
			notify.error("No environments found");
			return;
		}

		const chosenEnvironment = await this.pixi_service.chooseEnvironment(
			manifestPath
		);
		if (!chosenEnvironment) {
			notify.error("No environment selected");
			return;
		}
		const env = envs.find((e: any) => e.name === chosenEnvironment);
		if (!env) {
			notify.error("Environment not found");
			return;
		}

		const cmd = `pixi shell -e ${env.name} --manifest-path ${manifestPath}`;
		console.log(cmd);
		// run "pixi shell -e $env" command
		this.vse.openTerminalAndRunCommand(cmd, `Pixi: ${env.name}`, true);
	}

	/**
	 * Get the Pixi project directory
	 *
	 * @param uri - the uri of the folder to initialize the project in
	 * @param updateWorkspaceFolder - boolean to update the workspace folder
	 * @returns - the project directory and a boolean to update the workspace folder
	 *
	 * @description
	 *	LOGIC: Determine the project directory based on the uri and workspace folders
	 *
	 * 	if : uri is not null, then user must've right-clicked on a folder in explorer
	 * 	else if : no workspace folders open, then pick a system folder and prompt for
	 * 						project name
	 * 	else : if workspace folders open, then choose one of them
	 */
	private async getPixiProjectDir(uri: vscode.Uri): Promise<{
		projectDir: vscode.Uri;
		updateWorkspaceFolder: boolean;
	}> {
		if (uri) {
			return { projectDir: uri, updateWorkspaceFolder: false };
		}

		if (await this.vse.isEmptyWorkspace()) {
			// This should really only happen during a Pixi::init command.
			const parentDir = (await this.vse.openFolder())![0];
			const projectName = await this.vse.promptForProjectName();
			if (!projectName) {
				return {
					projectDir: vscode.Uri.parse(""),
					updateWorkspaceFolder: false,
				};
			}

			return {
				projectDir: vscode.Uri.joinPath(parentDir, projectName),
				// true so that after pixi init, open the chosen folder in the current window
				updateWorkspaceFolder: true,
			};
		}

		return {
			projectDir: (await this.vse.chooseWorkspaceFolder())!.uri,
			updateWorkspaceFolder: false,
		};
	}

	async findManifestFile(pixi_project_dir: string) {
		return (await this.pixi_service.findProjectFile(pixi_project_dir)) || "";
	}
}
