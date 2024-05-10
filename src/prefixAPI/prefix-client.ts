// services/client.ts
import { ApolloClient, InMemoryCache } from "@apollo/client";

import * as queries from "./queries";

import * as vscode from "vscode";

export class PrefixClient {
	private static baseURL = "https://prefix.dev/api/graphql";

	private instance = new ApolloClient({
		uri: PrefixClient.baseURL,
		cache: new InMemoryCache(),
		headers: {
			Authorization:
				`Bearer ` +
					vscode.workspace
						.getConfiguration("pixi-vscode")
						.get("prefixAPIKey") || "",
		},
	});

	constructor() {}

	static getBaseURL() {
		return PrefixClient.baseURL;
	}

	async getAllChannels() {
		const result = await this.instance.query({
			query: queries.GET_USER_CHANNELS,
			variables: {
				page: 0,
			},
		});

		const totalPages = result.data.channels.pages;
		const allChannels: {
			name: string;
			description: string;
			baseUrl: string;
			owner: string;
		}[] = [];

		for (let i = 0; i < totalPages; i++) {
			const result = await this.instance.query({
				query: queries.GET_USER_CHANNELS,
				variables: {
					page: i,
				},
			});
			allChannels.push(
				...result.data.channels.page.map((channel: any) => ({
					name: channel.name,
					description: channel.description,
					baseUrl: channel.baseUrl,
					owner: channel.owner || "",
				}))
			);
		}

		return allChannels;
	}

	async getPackages(packageName: string) {
		const result = await this.instance.query({
			query: queries.FIND_PACKAGES,
			variables: {
				packageName: packageName,
			},
		});

		// extract the package names and their channel names
		const packageNames: {
			channel: string;
			package: string;
			summary: string;
			version: string;
		}[] = [];
		result.data.packages.page.flatMap((pkg: any) => {
			packageNames.push({
				channel: pkg.channel.name,
				package: pkg.name,
				summary: pkg.summary,
				version: pkg.latestVersion.version,
			});
		});
		return packageNames;
	}
}
