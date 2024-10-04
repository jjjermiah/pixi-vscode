import * as vscode from "vscode";

interface dataItem {
	key: string;
	value?: any; // This can be a primitive value or a nested structure
	parentKey?: string; // To keep track of parent-child relationships
	isLeaf?: boolean; // Optionally mark if this item is a leaf (has no children)
	more_data?: any;
	definition?: string;
	meta_file?: string;
	site_packages?: string;
}
import { PixiPlatform, PixiCommand, PixiProjectType } from "../enums";
import { PackageInfo, Pixi } from "../environmentManagers/pixi";
import { PixiInfo } from "../types";
import path from "path";
import * as fs from "fs/promises";
import { execShellWithTimeout } from "../common/shell";

export type SitePackagesOutput = {
	sys_path: string[];
	USER_BASE: string;
	USER_SITE: string;
	ENABLE_USER_SITE: string;
};
export class PixiTreeDataProvider implements vscode.TreeDataProvider<dataItem> {
	pixi: Pixi;
	subset: string = "";

	onDidChangeTreeData?: vscode.Event<
		dataItem | dataItem[] | undefined | null | void
	>;

	constructor(subset: string = "") {
		if (subset === "envs") {
			this.subset = "environments_info";
		}
		this.pixi = new Pixi(
			PixiCommand.tool,
			vscode.workspace.workspaceFolders?.[0].uri.fsPath || process.cwd()
		);
	}

	/*
	 */
	getTreeItem(element: dataItem): vscode.TreeItem {
		// console.log("treeitem", element);
		// Example of using TreeItemLabel in a code line:
		const itemLabel: vscode.TreeItemLabel = {
			label: element.key,
			// highlights: [[0, 7]], // Highlights the word "Example"
		};
		const treeItem = new vscode.TreeItem(
			itemLabel,
			element.isLeaf
				? vscode.TreeItemCollapsibleState.None
				: vscode.TreeItemCollapsibleState.Collapsed
		);
		treeItem.contextValue = "pixi-view";
		if (element.definition === "package") {
			treeItem.iconPath = new vscode.ThemeIcon("package");
		} else if (element.definition === "version") {
			treeItem.iconPath = new vscode.ThemeIcon("versions");
		} else if (element.definition === "kind") {
			treeItem.iconPath = new vscode.ThemeIcon("repo");
		} else if (element.definition === "meta_file") {
			treeItem.contextValue = "meta_file";
			console.log(treeItem);
		} else if (element.definition === "site_packages") {
			treeItem.contextValue = "site_packages";
			treeItem.contextValue = "site_packages";
			console.log(treeItem);
		} else {
			treeItem.iconPath = new vscode.ThemeIcon("file-directory");
		}
		treeItem.description = element.value;

		return treeItem;
	}

	/**
	 * Get the children of `element` or root if no element is passed.
	 * @param element The element from which the provider gets children. Can be `undefined`.
	 * @returns Children of `element` or root if no element is passed.
	 */
	async getChildren(element?: dataItem): Promise<dataItem[]> {
		if (!element) {
			try {
				const pixiInfo: PixiInfo | undefined = await this.pixi.getPixiInfo();
				// console.log(pixiInfo);

				// initialize empty itemlist
				const items2return: dataItem[] = [];

				if (this.subset === "environments_info") {
					// add the top level items
					pixiInfo?.environments_info.forEach((env) => {
						items2return.push({
							key: env.name,
							value: env.name,
							parentKey: "",
							isLeaf: false,
							more_data: env,
							definition: "environment",
						});
					});
					return items2return;
				}

				items2return.push({
					key: pixiInfo?.project_info?.name ?? "no_project_info",
					value: pixiInfo?.project_info?.manifest_path,
					parentKey: "",
					isLeaf: false,
				});

				return items2return;
			} catch (error) {
				console.error(error);
				return [];
			}
		}

		if (element.definition === "environment") {
			// initialize empty itemlist
			const items2return: dataItem[] = [];

			const env = element.more_data;
			const packageList = await this.pixi.getEnvironmentPackages(env.name);

			// Using for...of loop to handle async/await correctly
			for (const pkg of packageList) {
				const metaFile = await this.generateFileName(pkg, env.prefix);
				const sitePackages = await this.getSitePackageLocation(pkg, env);

				items2return.push({
					key: pkg.name,
					value: pkg.version,
					parentKey: env.name,
					isLeaf: false,
					definition: "package",
					more_data: pkg,
					meta_file: metaFile,
					site_packages: sitePackages ? sitePackages : "",
				});
			}

			return items2return;
		}

		if (element.definition === "package") {
			const items_to_return = [];

			/*
      push a leaf item for element.more_data["kind", "source", "version"] and element.meta_file if it isnt ""
      */
			const keys_of_interest = ["kind", "version", "source"];

			for (const key of keys_of_interest) {
				if (element.more_data[key]) {
					items_to_return.push({
						key: key,
						value: element.more_data[key],
						isLeaf: true,
						definition: key,
					});
				}
			}
			if (element.meta_file !== "") {
				items_to_return.push({
					key: "meta_file",
					value: element.meta_file,
					isLeaf: true,
					definition: "meta_file",
				});
			}

			if (element.site_packages !== "") {
				items_to_return.push({
					key: "site_packages",
					value: element.site_packages,
					isLeaf: true,
					definition: "site_packages",
				});
			}

			return items_to_return;
		}
	}

	async generateFileName(
		packageInfo: PackageInfo,
		prefix: string
	): Promise<string> {
		// Construct the path using the name, version, and build properties
		const fileName = `${packageInfo.name}-${packageInfo.version}-${packageInfo.build}.json`;
		const fullPath = path.join(prefix, "conda-meta", fileName);

		try {
			// Check if the file exists at {prefix}/conda-meta/{path}
			await fs.access(fullPath);
			// If no error is thrown, the file exists, return the full path
			return fullPath;
		} catch (error) {
			// Log the error and return an empty string if the file does not exist
			console.log("File does not exist:", error);
			return "";
		}
	}

	async getSitePackageLocation(
		packageInfo: PackageInfo,
		env: any
	): Promise<string> {
		const sitePackages = await this.getSitePackages(env);

		// check if it exists
		if (sitePackages === "") {
			return "";
		}

		try {
			const sitePackagesPath = path.join(sitePackages, packageInfo.name);
			await fs.access(sitePackagesPath);
      console.log(sitePackagesPath);
			return sitePackagesPath;
		} catch (error) {
			// console.log("File does not exist:", error);
			return ""; // Added return statement to handle error case
		}
	}

	async getSitePackages(env: any): Promise<string> {
		const pythonPath = await this.pixi.getPythonInterpreterPath(env);

		const output = await execShellWithTimeout(`${pythonPath} -m site`, 5000);

		const sitePackagesOutput = parseOutput(output);


		// get the entry in sys_path that ends in "site-packages"
		const sitePackagesPath = sitePackagesOutput.sys_path.find((path) =>
			path.endsWith("site-packages")
		);

		if (sitePackagesPath) {
			return sitePackagesPath;
		}
		return "";
	}
}

function parseOutput(output: string): SitePackagesOutput {
	const userBaseMatch = output.match(/USER_BASE:\s*'(.*?)'/);
	const userSiteMatch = output.match(/USER_SITE:\s*'(.*?)'/);
	const enableUserSiteMatch = output.match(/ENABLE_USER_SITE:\s*(True|False)/);

	// Ensure sysPathMatch is not null
	const sysPathMatch = output.match(/sys\.path\s*=\s*\[([\s\S]*?)\]/);
	const sysPath = sysPathMatch
		? sysPathMatch[1]
				.split("\n")
				.map((line) => line.trim().replace(/,$/, "").replace(/'/g, ""))
				.filter((line) => line.length > 0)
		: [];

	return {
		sys_path: sysPath,
		USER_BASE: userBaseMatch ? userBaseMatch[1] : "",
		USER_SITE: userSiteMatch ? userSiteMatch[1] : "",
		ENABLE_USER_SITE:
			enableUserSiteMatch && enableUserSiteMatch[1] === "True"
				? "True"
				: "False",
	};
}
