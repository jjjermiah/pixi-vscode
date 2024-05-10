/* eslint-disable curly */
import * as vscode from "vscode";
import * as notify from "../common/logging";
const Cache = require("vscode-cache");
import { PrefixClient } from "./prefix-client";
import { PixiPlatform, PixiCommand, PixiProjectType } from "../enums";

import { Pixi } from "../environmentManagers/pixi";

export class PixiService {
	private pixi: Pixi;
	private PixiCache: any;
	private prefixClient = new PrefixClient();

	constructor(cache: typeof Cache) {
		this.pixi = new Pixi(
			"pixi",
			vscode.workspace.workspaceFolders?.[0].uri.fsPath || process.cwd()
		);
		this.PixiCache = cache;
	}

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
	 * @returns A promise that resolves with an array of selected channel names.
	 */
	async chooseChannels(): Promise<string[]> {
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

		const items = await this.prepareItems({
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

		const selectedChannels = await this.showQuickPick({
			title: "Select Channels",
			placeholder: "Select Channels",
			items: items,
			canSelectMany: true,
			selectedItems: items.filter((item) =>
				defaultChannels.includes(item.label)
			),
		}).then((channels) => {
			this.PixiCache.put("selectedChannels", channels);
			return channels;
		});

		// return selectedChannels;

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
						description: "(Added in settings)",
					};
				}
			),
			"Other Platforms": otherPlatforms.map((platform: any) => {
				return {
					label: platform,
					description: "(Added in settings)",
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

	public async getEnvironmentNames(): Promise<string[] | undefined> {
		return this.pixi.EnvironmentNames();
	}

	public async getEnvironmentPrefixes(): Promise<string[] | undefined> {
		return this.pixi.EnvironmentPrefixes();
	}

	public async getEnvironmentInfo(): Promise<any | undefined> {
		return this.pixi.EnvironmentInfo();
	}

	public async getEnvironmentTasks(): Promise<any | undefined> {
		return this.pixi.Tasks();
	}
}
