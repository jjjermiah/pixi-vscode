// Copyright (c) Microsoft Corporation. All rights reserved.
// save the output of the pixi info command
// Licensed unde!r the MIT License.

// Inspired from
// https://github.com/microsoft/vscode-python/pull/22968/files#diff-584fabe84516093f6d4c24d3a247862ebb66ded6a70382347e06c84047d0f269

import {
	PixiProjectInfo,
	PixiInfo,
	PixiTask,
	environments_info,
} from "../types";
import { execShellWithTimeout } from "../common/shell";
import { PixiPlatform, PixiCommand, PixiProjectType } from "../enums";

export class Pixi {
	// save the output of the pixi info command
	public pixiInfo!: PixiInfo | undefined;

	constructor(private readonly command: string, private cwd: string) {
		this.getPixiInfo()
			.then((info) => {
				this.pixiInfo = info;
			})
			.catch((error) => {
				console.error(error);
			});
	}

	public async getPixiInfo(
		manifestPath?: string
	): Promise<PixiInfo | undefined> {
		const info = await execShellWithTimeout(
			`${this.command} info --json ${
				manifestPath ? `--manifest-path ${manifestPath}` : ""
			}`,
			5000,
			this.cwd
		)
			.then((output) => JSON.parse(output) as PixiInfo)
			.catch((error) => {
				console.error(error);
				return undefined;
			});
		return info;
	}

	public async PixiDefaultPlatform(): Promise<PixiPlatform | undefined> {
		return this.getPixiInfo().then((info) => info?.platform);
	}

	public async Channels(
		manifestPath?: string
	): Promise<string[] | undefined> {
		const allChannels: string[] = [];
		await this.EnvironmentInfo(manifestPath).then((envs) => {
			envs?.forEach((env) => {
				allChannels.push(...env.channels);
			});
		});
		// remove duplicates
		return Array.from(new Set(allChannels));
	}

	public async EnvironmentInfo(
		manifestPath?: string
	): Promise<environments_info[] | undefined> {
		return this.getPixiInfo(manifestPath ? manifestPath : undefined).then(
			(info) => info?.environments_info
		);
	}

	public async EnvironmentNames(
		manifestPath?: string
	): Promise<string[] | undefined> {
		return this.EnvironmentInfo(manifestPath).then((info) =>
			info?.map((env) => env.name)
		);
	}

	public async EnvironmentPrefixes(
		manifestPath?: string
	): Promise<string[] | undefined> {
		return this.EnvironmentInfo(manifestPath).then((info) =>
			info?.map((env) => env.prefix)
		);
	}

	public async Features(
		manifestPath?: string
	): Promise<string[] | undefined> {
		return this.EnvironmentInfo(manifestPath)
			.then((info) => info?.flatMap((env) => env.features))
			.then((features) => Array.from(new Set(features)));
	}

	public async Tasks(): Promise<PixiTask[] | undefined> {
		return this.EnvironmentInfo().then((info) =>
			// for each task within an environment, create a PixiTask
			info?.flatMap((env) =>
				env.tasks.map((task) => ({
					name: task,
					environment: env.name,
				}))
			)
		);
	}
}

// pixi.getPixiDefaultPlatform().then((platform) => {
// 	if (platform) {
// 		console.log(`Pixi default platform: ${platform}`);
// 	} else {
// 		error("No Pixi default platform found");
// 	}
// });

// pixi.getEnvironmentInfo().then((envs) => {
// 	if (envs) {
// 		console.log("Pixi environment info:");
// 		console.log(envs);
// 	} else {
// 		error("No Pixi environment info found");
// 	}
// });

// pixi.getEnvironmentNames().then((names) => {
// 	if (names) {
// 		console.log("Pixi environment names:");
// 		console.log(names);
// 	} else {
// 		error("No Pixi environment names found");
// 	}
// });

// pixi.getEnvironmentPrefixes().then((prefixes) => {
// 	if (prefixes) {
// 		console.log("Pixi environment prefixes:");
// 		console.log(prefixes);
// 	} else {
// 		error("No Pixi environment prefixes found");
// 	}
// });

// pixi.getPixiTasks().then((tasks) => {
// 	if (tasks) {
// 		console.log("Pixi tasks:");
// 		console.log(tasks);
// 	} else {
// 		error("No Pixi tasks found");
// 	}
// });
