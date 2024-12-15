// services/client.ts
import { ApolloClient, InMemoryCache } from "@apollo/client";
import * as queries from "./queries";

export class PrefixClient {
	private static baseURL = "https://prefix.dev/api/graphql";

	private instance: ApolloClient<any>;

	constructor(apiToken: string = "pfx-NaJLJieApvNZs3ZLps9Asu20F0ZVBMK2Bz90") {
		this.instance = new ApolloClient({
			uri: PrefixClient.baseURL,
			cache: new InMemoryCache(),
			headers: {
				Authorization: `Bearer ${apiToken}`,
			},
		});
	}

	static getBaseURL(): string {
		return PrefixClient.baseURL;
	}

	async getAllChannels(): Promise<
		{ name: string; description: string; baseUrl: string; owner: string }[]
	> {
		// Fetch the first page to determine the total number of pages
		const firstPage = await this.instance.query({
			query: queries.GET_USER_CHANNELS,
			variables: { page: 0 },
		});

		const totalPages = firstPage.data.channels.pages;

		// Fetch all pages in parallel
		const allResults = await Promise.all(
			Array.from({ length: totalPages }, (_, i) =>
				this.instance.query({
					query: queries.GET_USER_CHANNELS,
					variables: { page: i },
				})
			)
		);

		// Extract and flatten all channel data
		return allResults.flatMap((result) =>
			result.data.channels.page.map((channel: any) => ({
				name: channel.name,
				description: channel.description,
				baseUrl: channel.baseUrl,
				owner: channel.owner || "",
			}))
		);
	}

	async getPackages(
		packageName: string
	): Promise<
		{ channel: string; package: string; summary: string; version: string }[]
	> {
		const result = await this.instance.query({
			query: queries.FIND_PACKAGES,
			variables: { packageName },
		});

		// Transform package data
		return result.data.packages.page.map((pkg: any) => ({
			channel: pkg.channel.name,
			package: pkg.name,
			summary: pkg.summary,
			version: pkg.latestVersion.version,
		}));
	}
}
