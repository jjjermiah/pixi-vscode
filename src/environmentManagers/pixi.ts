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

// This type corresponds to the output of 'pixi info --json', and property
// names must be spelled exactly as they are in order to match the schema.
export type PackageInfo = {
	name: string;
	version: string;
	build: string;
	size_bytes: number;
	kind: string;
	source: string;
	is_explicit: boolean;
};


export class Pixi {
	// save the output of the pixi info command
	public pixiInfo!: PixiInfo | undefined;

	constructor(private readonly command: string, private cwd: string) {
		this.initializePixiInfo();
	}

	private async initializePixiInfo() {
		try {
			this.pixiInfo = await this.getPixiInfo();
		} catch (error) {
			console.error(error);
		}
	}

	public async getPixiInfo(
		manifestPath?: string
	): Promise<PixiInfo | undefined> {
		try {
			const output = await execShellWithTimeout(
				`${this.command} info --json ${
					manifestPath ? `--manifest-path ${manifestPath}` : ""
				}`,
				5000,
				this.cwd
			);
			const info = JSON.parse(output) as PixiInfo;
			return info;
		} catch (error) {
			console.error(error);
			return undefined;
		}
	}

	/**
	 * Get the user's default Pixi (aka rattler-build defined) platform
	 *
	 * @returns  the default platform
	 */
	public async PixiDefaultPlatform(): Promise<PixiPlatform | undefined> {
		return this.getPixiInfo().then((info) => info?.platform);
	}

	public async Channels(manifestPath?: string): Promise<string[] | undefined> {
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

	public async Features(manifestPath?: string): Promise<string[] | undefined> {
		return this.EnvironmentInfo(manifestPath)
			.then((info) => info?.flatMap((env) => env.features))
			.then((features) => Array.from(new Set(features)));
	}

	public async Tasks(manifestPath?: string): Promise<PixiTask[] | undefined> {
		return this.EnvironmentInfo(manifestPath).then((info) =>
			// for each task within an environment, create a PixiTask
			info?.flatMap((env) =>
				env.tasks.map((task) => ({
					name: task,
					environment: env.name,
				}))
			)
		);
	}

	public async getEnvironmentPackages(
		env_name: string,
		explicit: boolean = true
	): Promise<PackageInfo[]> {
		try {
			const output = await execShellWithTimeout(
				`${this.command} list ${explicit ? "-x" : ""} -e ${env_name} --json`,
				5000,
				this.cwd
			);
			const pixiList = JSON.parse(output) as PackageInfo[];
			return pixiList;
		} catch (error) {
			console.error('Failed to get environment packages:', error);
			return [];
		}
	}

	/**
	 * Returns the path to the Python interpreter used by the workspace.
	 *
	 *
	 * @param `environments_info` env_info - The environments_info object
	 * containing the prefix path to the Python interpreter.
	 *
	 * @returns The path to the Python interpreter.
	 */
	public async getPythonInterpreterPath(
		env_info: environments_info
	): Promise<string> {
		return `${env_info.prefix}/bin/python`;
	}

	
}
