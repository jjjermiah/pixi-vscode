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
} from "../api";
import { createDeferred, Deferred } from "../common/deferred";
import * as log from "../common/logging";
import { Pixi } from "./pixiAPI";
import { withProgress } from "../common/windowAPI";
import * as vscode from "vscode";
import * as os from "os";

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

    constructor(
        outputChannel: LogOutputChannel,
        pixi_projects: Pixi[],
        api: PythonEnvironmentApi
    ) {
        this.log = outputChannel;
        this.pixi_projects = pixi_projects;
        this.api = api;
    }

    // Event to be raised with the list of available extensions changes for this manager
    onDidChangeEnvironments?: Event<DidChangeEnvironmentsEventArgs> | undefined;

    // Event to be raised when the environment for any active scope changes
    onDidChangeEnvironment?: Event<DidChangeEnvironmentEventArgs> | undefined;

    private collection: PythonEnvironment[] = [];

    private _initialized: Deferred<void> | undefined;

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
                                    version: `${env.name}_version`,
                                    environmentPath: vscode.Uri.file(
                                        env.prefix
                                    ),
                                    // sysPrefix: env.prefix,
                                    sysPrefix: env.prefix,
                                    description: `features: ${env.features.join(
                                        ", "
                                    )}`,
                                    iconPath: this.iconPath,
                                    tooltip: tooltip_markdown,
                                    execInfo: {
                                        run: {
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
                                        shellActivation: new Map([
                                            [
                                                "zsh",
                                                [
                                                    {
                                                        executable: "pixi",
                                                        args: [
                                                            "shell",
                                                            "--manifest-path",
                                                            env.name,
                                                        ],
                                                    },
                                                ],
                                            ],
                                        ]),
                                        // TODO:: figure out deactivation
                                    },
                                    group: pixi.name,
                                },
                                this
                            );
                        (environment as PixiPythonEnvironment).pixi = pixi;
                        this.collection.push(environment);
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

        log.info("Refreshing environments with scope: ", scope);
        if (scope !== undefined) {
            // exit function
            return;
        }
        return;
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
    set(
        scope: SetEnvironmentScope,
        environment?: PythonEnvironment
    ): Promise<void> {
        // pass for now
        throw new Error("set Method not implemented.");
    }
    /**
     * Retrieves the current Python environment within the specified scope.
     * @param scope - The scope within which to retrieve the environment.
     * @returns A promise that resolves to the current Python environment, or undefined if none is set.
     */
    get(scope: GetEnvironmentScope): Promise<PythonEnvironment | undefined> {
        // pass for now
        throw new Error("get Method not implemented.");
    }

    resolve(
        context: ResolveEnvironmentContext
    ): Promise<PythonEnvironment | undefined> {
        // Code to resolve the environment goes here. Resolving an environment means
        // to convert paths to actual environments

        throw new Error("resolve Method not implemented.");
    }
}
