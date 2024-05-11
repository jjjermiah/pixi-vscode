/* eslint-disable curly */
import * as vscode from "vscode";
import * as notify from "../common/logging";
const Cache = require("vscode-cache");
import { PrefixClient } from "../prefixAPI/prefix-client";
import { PixiPlatform, PixiCommand, PixiProjectType } from "../enums";

import { Pixi } from "../environmentManagers/pixi";

interface IPixiService {
	init(): Promise<string[]>;
	chooseProjectType(): Promise<string>;
	choosePlatform(): Promise<string[]>;
	chooseChannels(): Promise<string[]>;
	getEnvironmentNames(): Promise<string[] | undefined>;
	getEnvironmentPrefixes(): Promise<string[] | undefined>;
	getEnvironmentInfo(): Promise<any | undefined>;
	getEnvironmentTasks(): Promise<any | undefined>;
}

/**
 * Represents the Pixi service.
 */
export class PixiService implements IPixiService {
	private pixi: Pixi;
	private PixiCache: any;
	private prefixClient = new PrefixClient();

	/**
	 * Initializes a new instance of the PixiService class.
	 *
	 * @param cache - The cache object for this user's session.
	 */
	constructor(cache: typeof Cache) {
		this.pixi = new Pixi(
			"pixi",
			vscode.workspace.workspaceFolders?.[0].uri.fsPath || process.cwd()
		);
		this.PixiCache = cache;
	}

	/**
	 * Initializes the Pixi service.
	 * Prompts the user to choose a project type, platform, and channels.
	 * Returns an array of strings representing the arguments for initialization.
	 *
	 * @returns A promise that resolves to an array of strings representing the arguments for initialization.
	 */
	async init(): Promise<string[]> {
		let args: string[] = [PixiCommand.init];

		await this.chooseProjectType().then((projectType) => {
			if (projectType === PixiProjectType.Pyproject) {
				args.push("--pyproject");
			}
		});

		await this.choosePlatform().then((platforms) => {
			platforms.forEach((platform) => {
				args.push("--platform", platform);
			});
		});

		await this.chooseChannels().then((channels) => {
			channels.forEach((channel) => {
				args.push("--channel", channel);
			});
		});
		return args;
	}

	/**
	 *
	 */
	async addChannel(definedChannels?: string[]): Promise<string[]> {
		let args: string[] = [PixiCommand.addChannel, "add"];
		await this.chooseChannels(definedChannels).then((channels) => {
			args.push(...channels);
		});
		return args;
	}

	/**
	 * Prompts the user to choose a project type and returns the selected project type.
	 * If no project type is selected, the default project type is returned.
	 * @returns A promise that resolves to the selected project type.
	 */
	async chooseProjectType(): Promise<string> {
		const defaultProjectType: string =
			vscode.workspace
				.getConfiguration("pixi-vscode")
				.get("defaultProjectType") || PixiProjectType.Pixi;

		const projectTypes = Object.values(PixiProjectType);

		const selectedProjectType = await this.showQuickPick({
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

	/**
	 * Asks the user to choose additional channels and returns the selected channels.
	 *
	 * @param definedChannels - An optional array of channel names that are
	 *  already defined.
	 * @returns A promise that resolves with an array of selected channel names.
	 */
	async chooseChannels(definedChannels?: string[]): Promise<string[]> {
		const defaultChannels: string[] = vscode.workspace
			.getConfiguration("pixi-vscode")
			.get<string[]>("defaultChannels", []);

		const previouslySelectedChannels: string[] = this.PixiCache.get(
			"selectedChannels",
			[]
		).filter((channel: any) => !defaultChannels.includes(channel));

		const allChannels = await this.prefixClient.getAllChannels();
		const filteredChannels = allChannels.filter((channel: any) => {
			return (
				!defaultChannels.includes(channel.name) &&
				!previouslySelectedChannels.find((c: any) => c === channel.name)
			);
		});

		let items: vscode.QuickPickItem[] = await this.prepareItems({
			"Default Channels": defaultChannels.map((platform: any) => {
				return {
					label: platform,
					description: "(Added in settings)",
				};
			}),
			"Previously Selected Channels": previouslySelectedChannels.map(
				(platform: any) => {
					return {
						label: platform,
						description: "",
					};
				}
			),
			"All Channels": filteredChannels.map((channel: any) => {
				return {
					label: channel.name,
					description: channel.description,
				};
			}),
		});
		// remove all the channels in definedChannels from the items
		let selectedItems: vscode.QuickPickItem[] = [];
		if (definedChannels) {
			items = items.filter(
				(item) => !definedChannels.includes(item.label)
			);
			selectedItems = [];
		} else {
			selectedItems = items.filter((item) =>
				defaultChannels.includes(item.label)
			);
		}
		const selectedChannels = await this.showQuickPick({
			title: "Select Channels",
			placeholder: "Select Channels",
			items: items,
			canSelectMany: true,
			selectedItems: selectedItems,
		}).then((channels) => {
			// combination of previously selected channels and newly selected channels
			// only unique values are stored
			this.PixiCache.put(
				"selectedChannels",
				Array.from(
					new Set([...previouslySelectedChannels, ...channels])
				)
			);
			return channels;
		});

		/**
		 * Use the selected channels to query the allChannels array
		 * and return the name if owner is empty, otherwise return baseUrl
		 */
		return selectedChannels.map((selectedChannel: any) => {
			const channel = allChannels.find(
				(c: any) => c.name === selectedChannel
			)!;
			return channel.owner ? channel.baseUrl : channel.name;
		});
	}

	/**
	 * Asks the user to choose additional platforms and returns the selected platforms.
	 *
	 * @returns A promise that resolves with an array of selected platform names.
	 */
	async choosePlatform(): Promise<string[]> {
		// the user's Operating System
		const userPlatform = await this.pixi.PixiDefaultPlatform();

		// User defined configuration for default platforms
		const defaultPlatforms: string[] = vscode.workspace
			.getConfiguration("pixi-vscode")
			.get<string[]>("defaultPlatforms", []) // Include a default empty array
			.filter((platform) => platform !== userPlatform); // Filter out the userPlatform

		// cached last selected platforms
		const previouslySelectedPlatforms: string[] = this.PixiCache.get(
			"selectedPlatforms",
			[]
		).filter((platform: any) => !defaultPlatforms.includes(platform));
		// all other platforms
		const otherPlatforms = Object.values(PixiPlatform).filter(
			(platform) => {
				return ![
					userPlatform,
					...previouslySelectedPlatforms,
					...defaultPlatforms,
				].includes(platform);
			}
		);

		const items = await this.prepareItems({
			"Default Platforms": defaultPlatforms.map((platform: any) => {
				return {
					label: platform,
					description: "(Added in settings)",
				};
			}),
			"Previously Selected Platforms": previouslySelectedPlatforms.map(
				(platform: any) => {
					return {
						label: platform,
					};
				}
			),
			"Other Platforms": otherPlatforms.map((platform: any) => {
				return {
					label: platform,
				};
			}),
		});
		const selectedPlatforms = await this.showQuickPick({
			title: `Select Platform in addition to current platform: ${userPlatform}`,
			placeholder: "Select Platform",
			items: items,
			canSelectMany: true,
			selectedItems: items.filter((item) =>
				defaultPlatforms.includes(item.label)
			),
		}).then((platforms) => {
			this.PixiCache.put("selectedPlatforms", platforms);
			return platforms;
		});

		return [userPlatform || "", ...selectedPlatforms];
	}

	/**
	 * Given a dictionary of keys as separator labels and values as arrays of items,
	 * returns an array of QuickPickItems with separators.
	 *
	 * @param items - An object containing key-value pairs, where the key is the label
	 * and the value is an array of values.
	 * @returns A promise that resolves to an array of QuickPickItems.
	 */
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

	/**
	 * Displays a quick pick menu with the provided options and returns the selected
	 * items as an array of strings.
	 *
	 * @param options - The options for the quick pick menu.
	 * @returns A promise that resolves to an array of selected item labels.
	 */
	private async showQuickPick(options: {
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

	private async QPSeparator(label: string): Promise<vscode.QuickPickItem> {
		return {
			label: label,
			kind: vscode.QuickPickItemKind.Separator,
		};
	}

	/**
	 * Locate a pixi.toml or pyproject.toml file in a given directory and return the path to it.
	 * @param dir - The directory to search for the file.
	 * @returns A promise that resolves to the path of the found file.
	 */
	public async findProjectFile(dir: string): Promise<string> {
		if (dir === undefined) {
			console.log("findProjectFile: dir is undefined");
			return "";
		}
		const files = await vscode.workspace.fs.readDirectory(
			vscode.Uri.file(dir)
		);
		// pixi.toml or pyproject.toml only
		const projectFile = files.find(
			(file) =>
				file[1] === vscode.FileType.File &&
				(file[0] === "pixi.toml" || file[0] === "pyproject.toml")
		);

		if (projectFile) {
			return vscode.Uri.file(`${dir}/${projectFile[0]}`).fsPath;
		}

		console.log("findProjectFile: No project file found");
		return "";
	}

	public async getChannels(
		manifestPath?: string
	): Promise<string[] | undefined> {
		return this.pixi.Channels(manifestPath);
	}

	/**
	 * Retrieves the names of the available environments.
	 *
	 * @returns A promise that resolves to an array of environment names.
	 */
	public async getEnvironmentNames(): Promise<string[] | undefined> {
		return this.pixi.EnvironmentNames();
	}

	/**
	 * Retrieves the prefixes of the available environments.
	 *
	 * @returns A promise that resolves to an array of environment prefixes.
	 */
	public async getEnvironmentPrefixes(): Promise<string[] | undefined> {
		return this.pixi.EnvironmentPrefixes();
	}

	/**
	 * Retrieves information about the current environment.
	 *
	 * @returns A promise that resolves to the environment information.
	 */
	public async getEnvironmentInfo(): Promise<any | undefined> {
		return this.pixi.EnvironmentInfo();
	}

	/**
	 * Retrieves the tasks of the current environment.
	 *
	 * @returns A promise that resolves to the environment tasks.
	 */
	public async getEnvironmentTasks(): Promise<any | undefined> {
		return this.pixi.Tasks();
	}
}
