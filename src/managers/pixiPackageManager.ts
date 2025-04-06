// import {
//   PackageManager,
//   PythonEnvironment,
//   DidChangePackagesEventArgs,
//   Package,
//   PackageInstallOptions,
//   PackageChangeKind,
//   Installable,
//   PythonEnvironmentApi,
//   RefreshEnvironmentsScope,
//   ResolveEnvironmentContext,
//   SetEnvironmentScope,
// } from "../api";
// import {
//   Event,
//   EventEmitter,
//   LogOutputChannel,
//   ProgressLocation,
//   ThemeIcon,
//   window,
// } from "vscode";
// import { Pixi } from "./pixiAPI";
// import { execShellWithTimeout } from "../common/shell";
// import { withProgress } from "../common/windowAPI";
// import { PixiPythonEnvironment } from "./pixiEnvironmentManager";
// import { PixiPackageList } from "../types/package_info";
// import * as log from "../common/logging";
// import { PrefixClient } from "../prefixAPI/prefix-client";

// export async function refreshPackages(
//   environment: PixiPythonEnvironment,
//   api: PythonEnvironmentApi,
//   manager: PackageManager
// ): Promise<Package[]> {
//   // list --json-pretty --no-lockfile-update --frozen
//   let args = [
//     "list",
//     "--json-pretty",
//     "--no-lockfile-update",
//     "--frozen",
//     "--manifest-path",
//     environment.pixi.manifestPath,
//   ];
//   log.debug("pixi list args:", args);
//   const data = await execShellWithTimeout(`pixi ${args.join(" ")}`, 5000);
//   const content = JSON.parse(data) as PixiPackageList[];
//   log.debug("pixi list output:", content[0]);

//   const packages: Package[] = [];
//   content.forEach((l) => {
//     const pkg = api.createPackageItem(
//       {
//         name: l.name,
//         displayName: l.name,
//         version: l.version,
//         description: l.version,
//         iconPath: l.is_explicit ? new ThemeIcon("star-full") : undefined,
//       },
//       environment,
//       manager
//     );
//     packages.push(pkg);
//   });
//   return packages;
// }

// // function getChanges(
// //   before: Package[],
// //   after: Package[]
// // ): { kind: PackageChangeKind; pkg: Package }[] {
// //   const changes: { kind: PackageChangeKind; pkg: Package }[] = [];
// //   before.forEach((pkg) =>
// //     changes.push({ kind: PackageChangeKind.remove, pkg })
// //   );
// //   after.forEach((pkg) => changes.push({ kind: PackageChangeKind.add, pkg }));
// //   return changes;
// // }

// export class PixiPackageManager implements PackageManager {
//   readonly name = "pixi";
//   readonly displayName = "Pixi DisplayName";
//   readonly description = "Manage packages using the Pixi package manager";
//   readonly tooltip = "Pixi package manager";
//   readonly log: LogOutputChannel;
//   private prefixClient: PrefixClient = new PrefixClient();

//   private packages: Map<string, Package[]> = new Map();

//   private readonly _onDidChangePackages =
//     new EventEmitter<DidChangePackagesEventArgs>();

//   // /**
//   //  * Event that is fired when packages change.
//   //  */
//   readonly onDidChangePackages: Event<DidChangePackagesEventArgs> =
//     this._onDidChangePackages.event;

//   constructor(
//     public readonly api: PythonEnvironmentApi,
//     log: LogOutputChannel
//   ) {
//     this.log = log;
//   }

//   /**
//    * Installs packages in the specified Python environment.
//    * @param environment - The Python environment in which to install packages.
//    * @param packages - The packages to install.
//    * @returns A promise that resolves when the installation is complete.
//    */
//   install(
//     environment: PythonEnvironment,
//     packages: string[],
//     options: PackageInstallOptions
//   ): Promise<void> {

//     throw new Error("install Method not implemented.");
//   }

//   /**
//    * Uninstalls packages from the specified Python environment.
//    * @param environment - The Python environment from which to uninstall packages.
//    * @param packages - The packages to uninstall, which can be an array of packages or strings.
//    * @returns A promise that resolves when the uninstall is complete.
//    */
//   uninstall(
//     environment: PythonEnvironment,
//     packages: Package[] | string[]
//   ): Promise<void> {
//     throw new Error("uninstall Method not implemented.");
//   }

//   /**
//    * Refreshes the package list for the specified Python environment.
//    * @param environment - The Python environment for which to refresh the package list.
//    * @returns A promise that resolves when the refresh is complete.
//    */
//   async refresh(environment: PythonEnvironment): Promise<void> {
//     await withProgress(
//       {
//         location: ProgressLocation.Window,
//         title: "Refreshing packages",
//       },
//       async () => {
//         this.packages.set(
//           environment.envId.id,
//           await refreshPackages(
//             environment as PixiPythonEnvironment,
//             this.api,
//             this
//           )
//         );
//       }
//     );
//   }

//   /**
//    * Retrieves the list of packages for the specified Python environment.
//    * @param environment - The Python environment for which to retrieve packages.
//    * @returns An array of packages, or undefined if the packages could not be retrieved.
//    */
//   async getPackages(
//     environment: PythonEnvironment
//   ): Promise<Package[] | undefined> {
//     if (!this.packages.has(environment.envId.id)) {
//       await this.refresh(environment);
//     }
//     return this.packages.get(environment.envId.id);
//   }
//   /**
//    * Get a list of installable items for a Python project.
//    *
//    * @param environment The Python environment for which to get installable items.
//    *
//    * Note: An environment can be used by multiple projects, so the installable items returned.
//    * should be for the environment. If you want to do it for a particular project, then you should
//    * ask user to select a project, and filter the installable items based on the project.
//    */
//   async getInstallable?(
//     environment: PythonEnvironment
//   ): Promise<Installable[]> {
//     const twoOptions = ["pypi", "conda"];
//     let installableItems: Installable[] = twoOptions.map((pkg) => {
//       return {
//         displayName: pkg,
//         args: ["add", pkg === "pypi" ? "--pypi" : ""],
//         description: `Install ${pkg}`,
//       };
//     });

//     return installableItems;
//   }

//   async choosePackages() {
//     const qp = window.createQuickPick();
//     qp.placeholder = "Start typing to search for packages...";
//     qp.canSelectMany = true;
//     qp.show();

//     const searchAndSelectPackages = async (userInput: string) => {
//       if (!userInput.trim()) {
//         qp.items = [];
//         return;
//       }

//       let packagesFound: {
//         channel: string;
//         package: string;
//         summary: string;
//         version: string;
//       }[] = [];

//       packagesFound = await this.prefixClient.getPackages(userInput);
//       console.log(packagesFound);

//       qp.items = packagesFound.map((pkg) => {
//         return {
//           label: `${pkg.package}(v${pkg.version})`,
//           description: `from ${pkg.channel}`,
//           detail: pkg.summary,
//         };
//       });
//     };

//     qp.onDidChangeValue(async (userInput) => {
//       searchAndSelectPackages(userInput);
//     });

//     const selectedPackages = await new Promise<string[]>((resolve) => {
//       qp.onDidAccept(() => {
//         resolve(qp.selectedItems.map((item) => item.label));
//         qp.dispose();
//       });
//     });

//     console.log(selectedPackages);
//     // TODO: Use selected packages to query API For more details
//     // TODO: Figure out how to also let user choose multiple packages
//     return selectedPackages;
//   }

//   /**
//    * Clears the package manager's cache.
//    * @returns A promise that resolves when the cache is cleared.
//    */
//   clearCache?(): Promise<void> {
//     throw new Error("clearCache Method not implemented.");
//   }
// }
