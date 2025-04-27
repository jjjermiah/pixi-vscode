import {
    MarkdownString,
    LogOutputChannel,
    Event,
    ThemeIcon,
    ProgressLocation,
    CancellationError,
    CancellationToken,
    ProgressOptions,
    Progress,
    window,
} from "vscode";
import {
    CreateEnvironmentScope,
    DidChangeEnvironmentEventArgs,
    DidChangeEnvironmentsEventArgs,
    EnvironmentManager,
    GetEnvironmentScope,
    GetEnvironmentsScope,
    IconPath,
    PythonEnvironment,
    PythonEnvironmentApi,
    RefreshEnvironmentsScope,
    ResolveEnvironmentContext,
    SetEnvironmentScope,
    EnvironmentGroupInfo,
    PythonProject,
} from "../api";
import { createDeferred, Deferred } from "../common/deferred";
import * as log from "../common/logging";
import { Pixi } from "./pixiAPI";
import { withProgress } from "../common/windowAPI";
import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";

export function find_os_python_path(conda_env_dir: string): string {
    // this is supposed to find the python path within a conda directory
    // first check if the directory exists
    if (!conda_env_dir) {
        throw new Error("Conda env dir is not set");
    }
    if (!path.isAbsolute(conda_env_dir)) {
        conda_env_dir = path.join(
            vscode.workspace.workspaceFolders![0].uri.fsPath,
            conda_env_dir
        );
    }
    if (!vscode.workspace.fs.stat(vscode.Uri.file(conda_env_dir))) {
        throw new Error(`Conda env dir does not exist: ${conda_env_dir}`);
    }
    // check if the directory contains a python executable
    if (os.platform() === "win32") {
        // check for python.exe
        const python_path = path.join(conda_env_dir, "python.exe");
        if (vscode.workspace.fs.stat(vscode.Uri.file(python_path))) {
            return python_path;
        }
        // check for python
        const python_path2 = path.join(conda_env_dir, "python");
        if (vscode.workspace.fs.stat(vscode.Uri.file(python_path2))) {
            return python_path2;
        }
    } else {
        // check for python
        const python_path = path.join(conda_env_dir, "bin", "python");
        if (vscode.workspace.fs.stat(vscode.Uri.file(python_path))) {
            return python_path;
        }
    }
    // if no python executable is found, throw an error
    throw new Error(
        `No python executable found in conda env dir: ${conda_env_dir}`
    );
}

export interface PixiPythonEnvironment extends PythonEnvironment {
    pixi: Pixi;
}

export class PixiEnvironmentManager implements EnvironmentManager {
    name: string = "Pixi";
    displayName: string = "Pixi";
    preferredPackageManagerId: string = "jjjermiah.pixi-vscode:pixi";
    description: string = "Manage Pixi project environments";
    tooltip: string | MarkdownString = `Pixi environment manager`;
    iconPath: IconPath = new ThemeIcon("prefix-dev");
    log: LogOutputChannel;
    pixi_projects: Pixi[];
    api: PythonEnvironmentApi;

    private readonly _onDidChangeEnvironment =
        new vscode.EventEmitter<DidChangeEnvironmentEventArgs>();
    readonly onDidChangeEnvironment = this._onDidChangeEnvironment.event;

    private readonly _onDidChangeEnvironments =
        new vscode.EventEmitter<DidChangeEnvironmentsEventArgs>();
    readonly onDidChangeEnvironments = this._onDidChangeEnvironments.event;

    private collection: PixiPythonEnvironment[] = [];

    private _initialized: Deferred<void> | undefined;
    private fsPathToEnv: Map<string, PythonEnvironment> = new Map();

    constructor(
        outputChannel: LogOutputChannel,
        pixi_projects: Pixi[],
        api: PythonEnvironmentApi
    ) {
        this.log = outputChannel;
        this.pixi_projects = pixi_projects;
        this.api = api;
    }

    async initialize(): Promise<void> {
        if (this._initialized) {
            return this._initialized.promise;
        }

        this._initialized = createDeferred<void>();

        // Code to initialize the environment manager goes here
        // This may involve reading configuration, setting up event listeners etc.
        await withProgress(
            {
                location: ProgressLocation.Window,
                title: "Pixi Environment Manager",
                cancellable: true,
            },
            async (progress, token) => {
                progress.report({
                    message: "Initializing Pixi Environment Manager",
                });

                const bin = os.platform() === "win32" ? "python.exe" : "python";

                this.pixi_projects.forEach((pixi) => {
                    pixi.pixiInfo.environments_info.forEach((env) => {
                        let tooltip_markdown = new MarkdownString();
                        tooltip_markdown.appendMarkdown(`# ${env.name}\n`);
                        tooltip_markdown.appendMarkdown(
                            `**features**: ${env.features.join(", ")}\n\n`
                        );
                        tooltip_markdown.appendMarkdown(
                            `**prefix**: \`${env.prefix}\``
                        );
                        const environment =
                            this.api.createPythonEnvironmentItem(
                                {
                                    name: env.name,
                                    displayName: env.name,
                                    shortDisplayName: `${env.name}_short`,
                                    displayPath: `${env.name}_path`,
                                    version: `1.0`,
                                    environmentPath: vscode.Uri.file(
                                        find_os_python_path(env.prefix)
                                    ),
                                    // sysPrefix: env.prefix,
                                    sysPrefix: env.prefix,
                                    description: `features: ${env.features.join(
                                        ", "
                                    )}`,
                                    iconPath: this.iconPath,
                                    tooltip: tooltip_markdown,
                                    execInfo: {
                                        activatedRun: {
                                            executable: "pixi",
                                            args: [
                                                "run",
                                                "--manifest-path",
                                                pixi.manifestPath,
                                                "--environment",
                                                env.name,
                                                bin,
                                            ],
                                        },
                                        run: {
                                            executable: "python",
                                            // executable: "pixi",
                                            // args: [
                                            //     "run",
                                            //     "--manifest-path",
                                            //     pixi.manifestPath,
                                            //     "--environment",
                                            //     env.name,
                                            //     bin,
                                            // ],
                                        },
                                        activation: [
                                            {
                                                executable: "pixi",
                                                args: [
                                                    "shell",
                                                    "--manifest-path",
                                                    pixi.manifestPath,
                                                    "--environment",
                                                    env.name,
                                                ],
                                            },
                                        ],
                                        // TODO:: figure out deactivation
                                    },
                                    // group: pixi.name,
                                    group: {
                                        name: pixi.name,
                                        description: `Description for ${pixi.name}`,
                                        tooltip: `Tooltip for ${pixi.name}`,
                                        iconPath: this.iconPath,
                                    },
                                },
                                this
                            );

                        (environment as PixiPythonEnvironment).pixi = pixi;
                        (this.collection as PixiPythonEnvironment[]).push(
                            environment as PixiPythonEnvironment
                        );
                        this.fsPathToEnv.set(
                            environment.environmentPath.fsPath,
                            environment
                        );
                    });
                });
            }
        );

        this._initialized.resolve();
    }

    /**
     * Creates a new Python environment within the specified scope.
     * @param scope - The scope within which to create the environment.
     * @returns A promise that resolves to the created Python environment, or undefined if creation failed.
     */
    create?(
        scope: CreateEnvironmentScope
    ): Promise<PythonEnvironment | undefined>;

    /**
     * Removes the specified Python environment.
     * @param environment - The Python environment to remove.
     * @returns A promise that resolves when the environment is removed.
     */
    remove?(environment: PythonEnvironment): Promise<void>;

    /**
     * Refreshes the list of Python environments within the specified scope.
     * @param scope - The scope within which to refresh environments.
     * @returns A promise that resolves when the refresh is complete.
     */
    async refresh(scope: RefreshEnvironmentsScope): Promise<void> {
        // Code to handle refreshing environments goes here
        // This is called when the user clicks on the refresh button in the UI
        throw new Error("Method not implemented.");
    }

    /**
     * Retrieves a list of Python environments within the specified scope.
     * @param scope - The scope within which to retrieve environments.
     * @returns A promise that resolves to an array of Python environments.
     */
    async getEnvironments(
        scope: GetEnvironmentsScope
    ): Promise<PythonEnvironment[]> {
        log.info("Getting environments with scope: ", scope);
        await this.initialize();

        if (scope === "all") {
            return Array.from(this.collection);
        }

        if (scope === "global") {
            return this.collection.filter((env) => {
                env.name === "base";
            });
        }

        if (scope instanceof vscode.Uri) {
            throw new Error("get env uri Method not implemented.");
        }

        return [];
    }

    /**
     * Sets the current Python environment within the specified scope.
     * @param scope - The scope within which to set the environment.
     * @param environment - The Python environment to set. If undefined, the environment is unset.
     * @returns A promise that resolves when the environment is set.
     */
    async set(
        scope: SetEnvironmentScope,
        environment?: PythonEnvironment
    ): Promise<void> {
        
        // TODO:: look into checking for environment installation status?
        await this.initialize();

        if (scope === undefined) {
            throw new Error(
                "PixiEnvironmentManager::set 'scope' is undefined. Not implemented."
            );
        } else if (scope instanceof vscode.Uri) {
            const folder = this.api.getPythonProject(scope);
            const fsPath = folder?.uri?.fsPath ?? scope.fsPath;

            if (environment) {
                this.fsPathToEnv.set(fsPath, environment);
            } else {
                this.fsPathToEnv.delete(fsPath);
            }
        } else if (
            Array.isArray(scope) &&
            scope.every((s) => s instanceof vscode.Uri)
        ) {
            scope.forEach((s) => {
                const folder = this.api.getPythonProject(s);
                const fsPath = folder?.uri?.fsPath ?? s.fsPath;
                if (environment) {
                    this.fsPathToEnv.set(fsPath, environment);
                } else {
                    this.fsPathToEnv.delete(fsPath);
                }
            });
        }

        this._onDidChangeEnvironment.fire({
            uri: Array.isArray(scope) ? scope[0] : scope,
            old: undefined,
            new: environment,
        });
    }
    /**
     * Retrieves the current Python environment within the specified scope.
     * @param scope - The scope within which to retrieve the environment.
     * @returns A promise that resolves to the current Python environment, or undefined if none is set.
     */
    async get(
        scope: GetEnvironmentScope
    ): Promise<PythonEnvironment | undefined> {

        // NOTE:: this gets called when doing set environment!
        await this.initialize();

        if (scope instanceof vscode.Uri) {
            const env = this.fsPathToEnv.get(scope.fsPath);
            if (env) {
                return env;
            }

            const project = this.api.getPythonProject(scope);
            if (project) {
                return this.fsPathToEnv.get(project.uri.fsPath);
            }
        }

        // If no scope or no matching env, return undefined
        return undefined;
    }

    async resolve(
        context: ResolveEnvironmentContext
    ): Promise<PythonEnvironment | undefined> {

        // NOTE:: this gets called when doing set environment as well!
        await this.initialize();

        if (context instanceof vscode.Uri) {
            let env = this.fsPathToEnv.get(context.fsPath);
            if (env) {
                return env;
            }

            const project = this.api.getPythonProject(context);
            if (project) {
                env = this.fsPathToEnv.get(project.uri.fsPath);
                if (env) {
                    return env;
                }
            }
        }

        return undefined;
    }
}
