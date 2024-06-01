/*
MIT License

Copyright (c) 2022-2024 Joshua Tang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


import Fuse from "fuse.js";
import { Uri, workspace } from "vscode";
import { PypiClient, PypiProject, PypiSimple } from "./pypi-client";

export class PypiService {
	private static packagesCacheName = "packages-cache.json";

	private globalStoragePath: Uri;
	private pypiClient: PypiClient;
	private projectsFuse: Fuse<PypiProject> | undefined;

	constructor(globalStoragePath: Uri, pypiClient: PypiClient) {
		this.globalStoragePath = globalStoragePath;
		this.pypiClient = pypiClient;

		this.loadAndGetPackages();
	}

	searchPackages(query: string): PypiProject[] | undefined {
		if (this.projectsFuse) {
			return this.projectsFuse
				.search(query, { limit: 10 })
				.map((result) => result.item);
		}
		return undefined;
	}

	clearProjectsFuse() {
		this.projectsFuse = undefined;
	}

	private get packagesCacheUri(): Uri {
		return Uri.joinPath(this.globalStoragePath, PypiService.packagesCacheName);
	}

	private async loadAndGetPackages() {
		const packages = await this.getCachedPackages();
		if (packages) {
			this.projectsFuse = this.getProjectsFuse(packages);
		}
		await this.getAndCachePackages();
	}

	private async getCachedPackages(): Promise<PypiSimple | undefined> {
		try {
			const bytes = await workspace.fs.readFile(this.packagesCacheUri);
			const packagesStr = new TextDecoder().decode(bytes);
			return JSON.parse(packagesStr) as PypiSimple;
		} catch (e) {}
		return undefined;
	}

	private getProjectsFuse(packages: PypiSimple) {
		return new Fuse(packages.projects, {
			minMatchCharLength: 2,
			keys: ["name"],
		});
	}

	private async getAndCachePackages() {
		try {
			const packages = await this.pypiClient.getPackages();
			await this.cachePackages(packages);
			this.projectsFuse = this.getProjectsFuse(packages);
		} catch (e) {}
	}

	private cachePackages(packages: PypiSimple) {
		const packagesStr = JSON.stringify(packages);
		const bytes = new TextEncoder().encode(packagesStr);
		return workspace.fs.writeFile(this.packagesCacheUri, bytes);
	}
}
