import * as vscode from "vscode";
import { PixiProjectType } from "./enums";

interface ProjectConfig {
	parentDir: vscode.Uri;
	projectName: string;
	projectType: string;
}
export async function initPixiWorkspace() {
	return async () => {
		// check if there is a workspace open
		if (vscode.workspace.workspaceFolders) {

			const response = await vscode.window.showInformationMessage(
				"Initialise a new Pixi project in the current workspace?",
				"Yes",
				"No"
			);

			if (response !== "Yes") {
				return;
			}
		}

		const projectConfig = await collectProjectConfiguration();
		if (!projectConfig) {
			return;
		}

		await initializeProject(projectConfig);
	};
}


async function collectProjectConfiguration(): Promise<ProjectConfig | undefined> {
	const folderSelection = await openFolder();
	if (!folderSelection) {
		return;
	}

	const projectName = await promptForProjectName();
	if (!projectName) {
		return;
	}

	const projectType = await chooseProjectType();
	if (!projectType) {
		return;
	}

	return {
		parentDir: folderSelection[0],
		projectName,
		projectType
	};
}

async function initializeProject(config: ProjectConfig): Promise<void> {
	try {
		console.log(`Initializing Pixi project in ${config.parentDir.fsPath}`);
		console.log(`Project Name: ${config.projectName}`);
		console.log(`Project Type: ${config.projectType}`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to initialize Pixi workspace: ${error}`);
	}
}
// This method is called when your extension is deactivated

export function deactivate() { }
// ask user to choose a folder to open


async function openFolder(): Promise<vscode.Uri[] | undefined> {
	return await vscode.window.showOpenDialog({
		openLabel: "Initialize New Pixi Project in: ",
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
	});
}
/**
 * Displays a quick pick menu with the provided options and returns the selected
 * items as an array of strings.
 *
 * @param options - The options for the quick pick menu.
 * @returns A promise that resolves to an array of selected item labels.
 */

async function showQuickPick(options: {
	title: string;
	placeholder: string;
	items: vscode.QuickPickItem[];
	canSelectMany: boolean;
	step?: number;
	totalSteps?: number;
	selectedItems?: vscode.QuickPickItem[];
	value?: string;
}): Promise<string[]> {
	const qp = vscode.window.createQuickPick(); // Add type parameter to createQuickPick
	qp.title = options.title;
	qp.placeholder = options.placeholder;
	qp.items = options.items;
	qp.canSelectMany = options.canSelectMany;
	if (options.step) qp.step = options.step;
	if (options.totalSteps) qp.totalSteps = options.totalSteps;
	if (options.selectedItems) qp.selectedItems = options.selectedItems;
	if (options.value) qp.value = options.value;
	qp.show();
	return new Promise((resolve) => {
		qp.onDidAccept(() => {
			let selections = qp.selectedItems;
			qp.dispose();
			resolve(selections.map((item) => item.label));
		});
	});
}
// TODO: unsure where to put this function ... only used during init. Maybe in the pixi-extensionservice?
async function promptForProjectName(): Promise<string | undefined> {
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
/**
 * Prompts the user to choose a project type and returns the selected project type.
 * If no project type is selected, the default project type is returned.
 * @returns A promise that resolves to the selected project type.
 */
async function chooseProjectType(): Promise<string> {
	const defaultProjectType: string = vscode.workspace
		.getConfiguration("pixi-vscode")
		.get("defaultProjectType") || PixiProjectType.Pixi;

	const projectTypes = Object.values(PixiProjectType);

	const selectedProjectType = await showQuickPick({
		title: "Select Project Type",
		placeholder: `Default : ${defaultProjectType}`,
		canSelectMany: false,
		items: projectTypes.map((type: any) => {
			return {
				label: type,
			};
		}),
		value: defaultProjectType,
	}).then((projectType) => projectType[0]);
	return selectedProjectType!;
}
