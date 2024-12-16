import * as vscode from "vscode";
import { PixiProjectType, PixiPlatform } from "./enums";
import { showQuickPick } from "./common/vscode";
import * as log from "./common/logging";
import { PrefixClient } from "./prefixAPI/prefix-client";
import { Pixi } from "./managers/pixi";

const Cache = require("vscode-cache");

interface ProjectConfig {
	parentDir: vscode.Uri;
	projectName: string;
	projectType: string;
	platforms?: string[];
	channels?: string[];
}

interface IProjectInitializer {
	initPixiWorkspace(): Promise<void>;
}

class ProjectConfigurationCollector {
	private cache: any;
	private pixiProjects: Pixi[];

	constructor(cache: any, pixiProjects: Pixi[]) {
		this.cache = cache;
		this.pixiProjects = pixiProjects;
	}

	public async collectProjectConfiguration(): Promise<ProjectConfig | undefined> {
		const folderSelection = await vscode.window.showOpenDialog({
			openLabel: "Initialize New Pixi Project in: ",
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
		});
		if (!folderSelection) {
			return;
		}

		const tokenSource = new vscode.CancellationTokenSource();
		const projectName = await this.promptForProjectName(tokenSource.token);
		if (!projectName) {
			return;
		}

		const projectType = await this.chooseProjectType();
		if (!projectType) {
			return;
		}

		const platforms = await this.getPlatforms();

		return {
			parentDir: folderSelection[0],
			projectName,
			projectType,
			platforms,
			channels: []
		};
	}

	private async promptForProjectName(token: vscode.CancellationToken): Promise<string | undefined> {
		const projectName = await vscode.window.showInputBox({
			title: "Enter Project Name",
			placeHolder: "Enter a project name."
		}, token);
		if (token.isCancellationRequested) {
			log.debug("User cancelled project name input.");
			return;
		}
		return projectName;
	}

	private async chooseProjectType(): Promise<string> {
		const defaultProjectType: string = vscode.workspace
			.getConfiguration("pixi-vscode")
			.get("defaultProjectType") || "";

		const projectTypes = Object.values(PixiProjectType).map(type => ({ label: type }));

		const selectedProjectType = await showQuickPick({
			title: `Select Project Type${defaultProjectType ? ` (Default: ${defaultProjectType})` : ""}`,
			placeholder: `Default: ${defaultProjectType}`,
			canSelectMany: false,
			items: projectTypes,
			value: defaultProjectType,
		}).then(projectType => projectType[0]);

		return selectedProjectType!;
	}

	private async getPlatforms(): Promise<string[]> {
		const userPlatform = await this.pixiProjects[0].getPixiInfo().then(info => info.platform);
		const defaultPlatforms: string[] = vscode.workspace
			.getConfiguration("pixi-vscode.defaults")
			.get<string[]>("defaultPlatforms", [])
			.filter((platform) => platform !== userPlatform);

		const previouslySelectedPlatforms: string[] = this.cache.get(
			"selectedPlatforms",
			[]
		).filter((platform: any) => !defaultPlatforms.includes(platform));

		log.info("User Platform: ", userPlatform);
		log.info("Default Platforms: ", defaultPlatforms);
		log.info("Previously selected platforms: ", previouslySelectedPlatforms);

		const otherPlatforms = Object.values(PixiPlatform).filter((platform) => {
			return ![
				userPlatform,
				...previouslySelectedPlatforms,
				...defaultPlatforms,
			].includes(platform);
		});

		const items = await this.prepareItems({
			"Default Platforms": defaultPlatforms.map((platform: any) => ({
				label: platform,
				description: "(Added in settings)",
			})),
			"Previously Selected Platforms": previouslySelectedPlatforms.map(
				(platform: any) => ({
					label: platform,
				})
			),
			"Other Platforms": otherPlatforms.map((platform: any) => ({
					label: platform,
			})),
		});
		const selectedPlatforms = await showQuickPick({
			title: `Select Platform in addition to current platform: ${userPlatform}`,
			placeholder: "Select Platform",
			items: items,
			canSelectMany: true,
			selectedItems: items.filter((item) =>
				defaultPlatforms.includes(item.label)
			),
		}).then((platforms) => {
			this.cache.put("selectedPlatforms", [...previouslySelectedPlatforms, ...platforms]);
			return platforms;
		});

		return [userPlatform || "", ...selectedPlatforms];
	}

	private async prepareItems(items: {
		[key: string]: { label: string; description?: string }[];
	}): Promise<vscode.QuickPickItem[]> {
		const preparedItems: vscode.QuickPickItem[] = [];
		for (const [label, values] of Object.entries(items)) {
			preparedItems.push(await this.QPSeparator(label));
			preparedItems.push(...values);
		}
		return preparedItems;
	}

	private async QPSeparator(label: string): Promise<vscode.QuickPickItem> {
		return {
			label: label,
			kind: vscode.QuickPickItemKind.Separator,
		};
	}
}

export class PixiWorkspaceInitializer implements IProjectInitializer {
	private cache: any;
	private pixiProjects: Pixi[];
	private prefixClient: PrefixClient = new PrefixClient();
	private configCollector: ProjectConfigurationCollector;

	constructor(cache: typeof Cache, pixiProjects: Pixi[]) {
		this.cache = cache;
		this.pixiProjects = pixiProjects.length > 0 ? pixiProjects : [new Pixi("pseudo_project")];
		this.configCollector = new ProjectConfigurationCollector(cache, this.pixiProjects);
	}

	public async initPixiWorkspace(): Promise<void> {
		console.log("Init Pixi Workspace");
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

		const projectConfig = await this.configCollector.collectProjectConfiguration();
		if (!projectConfig) {
			return;
		}

		await this.initializeProject(projectConfig);
	}

	private async initializeProject(config: ProjectConfig): Promise<void> {
		try {
			console.log("Initializing Pixi project with config: ", config);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to initialize Pixi workspace: ${error}`);
		}
	}
}
