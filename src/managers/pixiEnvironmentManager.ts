// import {
//   MarkdownString,
//   LogOutputChannel,
//   Event,
//   ThemeIcon,
//   ProgressLocation,
//   CancellationError,
//   CancellationToken,
//   ProgressOptions,
//   Progress,
//   window,
// } from "vscode";
// import {
//   CreateEnvironmentScope,
//   DidChangeEnvironmentEventArgs,
//   DidChangeEnvironmentsEventArgs,
//   EnvironmentManager,
//   GetEnvironmentScope,
//   GetEnvironmentsScope,
//   IconPath,
//   PythonEnvironment,
//   PythonEnvironmentApi,
//   RefreshEnvironmentsScope,
//   ResolveEnvironmentContext,
//   SetEnvironmentScope,
// } from "../api";

// import { createDeferred, Deferred } from "../common/deferred";
// import * as log from "../common/logging";
// import { Pixi } from "./pixiAPI";
// import { withProgress } from "../common/windowAPI";
// import * as vscode from "vscode";
// import * as os from "os";

// export interface PixiPythonEnvironment extends PythonEnvironment {
//   pixi: Pixi;
// }

// export class PixiEnvironmentManager implements EnvironmentManager {
//   name: string = "Pixi";
//   displayName: string = "Pixi";
//   preferredPackageManagerId: string = "jjjermiah.pixi-vscode2:pixi";
//   description: string = "Manage Pixi project environments";
//   tooltip: string | MarkdownString = `Pixi environment manager`;
//   iconPath: IconPath = new ThemeIcon("prefix-dev");
//   log: LogOutputChannel;
//   pixi_projects: Pixi[];
//   api: PythonEnvironmentApi;

//   // Event to be raised with the list of available extensions changes for this manager
//   onDidChangeEnvironments?: Event<DidChangeEnvironmentsEventArgs> | undefined;

//   // Event to be raised when the environment for any active scope changes
//   onDidChangeEnvironment?: Event<DidChangeEnvironmentEventArgs> | undefined;

//   constructor(
//     outputChannel: LogOutputChannel,
//     pixi_projects: Pixi[],
//     api: PythonEnvironmentApi
//   ) {
//     this.log = outputChannel;
//     this.pixi_projects = pixi_projects;
//     this.api = api;
//   }

//   private collection: PythonEnvironment[] = [];

//   private _initialized: Deferred<void> | undefined;

//   async initialize(): Promise<void> {
//     if (this._initialized) {
//       return this._initialized.promise;
//     }

//     this._initialized = createDeferred<void>();

//     // Code to initialize the environment manager goes here
//     // This may involve reading configuration, setting up event listeners etc.
//     await withProgress(
//       {
//         location: ProgressLocation.Window,
//         title: "Pixi Environment Manager",
//         cancellable: true,
//       },
//       async (progress, token) => {
//         progress.report({ message: "Initializing Pixi Environment Manager" });

//         const bin = os.platform() === 'win32' ? 'python.exe' : 'python';

//         this.pixi_projects.forEach((pixi) => {
//           pixi.pixiInfo.environments_info.forEach((env) => {
//             let tooltip_markdown = new MarkdownString();
//             tooltip_markdown.appendMarkdown(`# ${env.name}\n`);
//             tooltip_markdown.appendMarkdown(
//               `**features**: ${env.features.join(", ")}\n\n`
//             );
//             tooltip_markdown.appendMarkdown(`**prefix**: \`${env.prefix}\``);
//             const environment = this.api.createPythonEnvironmentItem(
//               {
//                 name: env.name,
//                 displayName: env.name,
//                 shortDisplayName: `${env.name}_short`,
//                 displayPath: `${env.name}_path`,
//                 version: `${env.name}_version`,
//                 environmentPath: vscode.Uri.file(env.prefix),
//                 sysPrefix: env.prefix,
//                 description: `features: ${env.features.join(", ")}`,
//                 tooltip: tooltip_markdown,
//                 execInfo: {
//                   run: {
//                     executable: "pixi",
//                     args: [
//                       "run",
//                       "--manifest-path",
//                       pixi.manifestPath,
//                       "--environment",
//                       env.name,
//                       bin,
//                     ],
//                   },
//                   activation: [
//                     {
//                       executable: "pixi",
//                       args: [
//                         "shell",
//                         "--manifest-path",
//                         pixi.manifestPath,
//                         "--environment",
//                         env.name,
//                       ],
//                     },
//                   ],
//                   // TODO:: figure out deactivation
//                 },
//               },
//               this
//             );
//             (environment as PixiPythonEnvironment).pixi = pixi;
//             this.collection.push(environment);
//           });
//         });
//       }
//     );

//     this._initialized.resolve();
//   }

//   // Code to handle creating environments goes here
//   // so, this is called when the user clicks on the "+" button in the UI
//   // if multiple workspaces are available, the user will be prompted to select one or more
//   // for now, we only handle choosing one workspace
//   // scope can be a URI | URI[] | 'global'
//   async create?(
//     scope: CreateEnvironmentScope
//   ): Promise<PythonEnvironment | undefined> {
//     log.info("Creating environment with scope: ", scope);

//     // if scope is NOT a single URI, throw an error
//     if (Array.isArray(scope) && scope.length !== 1) {
//       const errmsg = `Pixi EnvMgr::Create -- length of scope is ${scope.length}`;
//       log.error(errmsg);
//       throw new Error(errmsg);
//     } else if (scope === "global") {
//       const errmsg = `Pixi EnvMgr::Create -- scope is 'global', not implemented`;
//       log.error(errmsg);
//       throw new Error(errmsg);
//     }

//     // if scope is a single URI, get the path
//     let path: string = "";
//     if (scope instanceof vscode.Uri) {
//       path = scope.fsPath;
//     } else {
//       path = scope[0].fsPath;
//     }

//     log.debug(`Pixi EnvMgr::Create -- path: ${path}`);
//     await withProgress(
//       {
//         location: ProgressLocation.Notification,
//         title: `Creating Pixi Environment`,
//         cancellable: true,
//       },
//       async (progress, token) => {
//         progress.report({ message: "Finding Pixi project" });

//         // find the Pixi project that matches the path
//         let pixi_project = this.pixi_projects.find((pixi) => {
//           // either the manifestPath is path OR path is a prefix (directory) of the manifestPath
//           return (
//             pixi.manifestPath === path || pixi.manifestPath.startsWith(path)
//           );
//         });

//         if (pixi_project === undefined) {
//           log.error(
//             `Pixi EnvMgr::Create -- no Pixi project found for path: ${path}`
//           );
//           return undefined;
//         } else {
//           log.info(
//             `Pixi EnvMgr::Create -- found Pixi project: ${pixi_project.manifestPath}`
//           );
//         }

//         // let user pick features
//         await pixi_project.createEnvironment(progress);
//       }
//     );

//     return undefined;
//   }

//   remove?(environment: PythonEnvironment): Promise<void> {
//     // Code to handle removing environments goes here

//     throw new Error("Method not implemented.");
//   }

//   async refresh(scope: RefreshEnvironmentsScope): Promise<void> {
//     // Code to handle refreshing environments goes here
//     // This is called when the user clicks on the refresh button in the UI

//     log.info("Refreshing environments with scope: ", scope);
//     if (scope !== undefined) {
//       // exit function
//       return;
//     }

//     throw new Error("Method not implemented.");
//   }

//   async getEnvironments(
//     scope: GetEnvironmentsScope
//   ): Promise<PythonEnvironment[]> {
//     // Code to get the list of environments goes here
//     // This may be called when the python extension is activated to get the list of environments
//     log.info("Getting environments with scope: ", scope);
//     await this.initialize();

//     if (scope === "all") {
//       return Array.from(this.collection);
//     }

//     if (scope === "global") {
//       return this.collection.filter((env) => {
//         env.name === "base";
//       });
//     }

//     if (scope instanceof vscode.Uri) {
//       throw new Error("Method not implemented.");
//     }

//     return [];
//   }

//   set(
//     scope: SetEnvironmentScope,
//     environment?: PythonEnvironment
//   ): Promise<void> {
//     // User selected a environment for the given scope
//     // undefined environment means user wants to reset the environment for the given scope

//     throw new Error("Method not implemented.");
//   }
//   get(scope: GetEnvironmentScope): Promise<PythonEnvironment | undefined> {
//     // Code to get the environment for the given scope goes here

//     throw new Error("Method not implemented.");
//   }

//   resolve(
//     context: ResolveEnvironmentContext
//   ): Promise<PythonEnvironment | undefined> {
//     // Code to resolve the environment goes here. Resolving an environment means
//     // to convert paths to actual environments

//     throw new Error("Method not implemented.");
//   }

//   clearCache?(): Promise<void> {
//     // Code to clear any cached data goes here

//     throw new Error("Method not implemented.");
//   }
// }
