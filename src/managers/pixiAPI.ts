import { debug, info, warn, error } from "../common/logging";
import * as notify from "../common/notification";
import * as shell from "../common/shell";
import { PixiInfo } from "../types/pixi_info";
import { getPixiExecutablePath } from "../config";
import * as vscode from "vscode";

export class Pixi {
    public pixiInfo: PixiInfo | null = null;

    /**
     * Constructs a Pixi instance and attempts to initialize project data.
     */
    constructor(public manifestPath: string) {
        this.initialize();
        if (this.manifestPath && this.pixiInfo && this.pixiInfo.project_info) {
            this.setupFileWatcher();
        }
    }
    /**
     * Sets up a file watcher for the manifest file.
     * Helps catch subtle modifications that can break environment setups.
     */
    private setupFileWatcher(): void {
        const fileWatcher = vscode.workspace.createFileSystemWatcher(
            this.manifestPath || ""
        );
        fileWatcher.onDidChange(() => {
            info(
                `Manifest updated. Resetting Pixi Info for ${this.manifestPath}`
            );
            this.initialize();
        });
        fileWatcher.onDidDelete(() => {
            error(`Manifest file ${this.manifestPath} was deleted`);
        });
    }

    /**
     * Initializes Pixi info from the manifest file.
     */
    private async initialize(): Promise<void> {
        try {
            const info = await this.getPixiInfo();

            if (!info) {
                throw new Error("Failed to get Pixi Info");
            }

            if (!info.project_info) {
                throw new Error(
                    "Not a valid Pixi Project, missing 'project_info'"
                );
            }

            this.logPixiInfo(info);
        } catch (error) {
            if (error instanceof Error) {
                warn(error.message, this.manifestPath);
            } else {
                warn(
                    `An unknown error occurred. Error: ${error}`,
                    this.manifestPath
                );
            }
        }
    }

    /**
     * Retrieves a list of environment names.
     */
    public async EnvironmentNames(): Promise<string[]> {
        if (!this.pixiInfo) {
            return [];
        }

        return this.pixiInfo.environments_info.map((env) => env.name);
    }

    /**
     * Creates a new environment by prompting for features and a name.
     * Non-obvious: This process guards against name collisions with a flexible naming approach.
     */
    public async createEnvironment(
        progress: vscode.Progress<{ message?: string }>
    ): Promise<void> {
        const env_names = await this.EnvironmentNames();

        progress.report({ message: "Fetching Features" });
        const selected_features = await vscode.window.showQuickPick(
            this.featureNames,
            {
                canPickMany: true,
                placeHolder: "Select Features for the Environment",
            }
        );

        if (!selected_features) {
            return;
        }

        progress.report({ message: "Choosing Environment Name" });
        const selected_env_name = await vscode.window.showInputBox({
            prompt: "Enter a name for the new environment",
            placeHolder: "Environment Name",
            validateInput: (value) => {
                if (env_names.includes(value)) {
                    return {
                        message: `Error: Environment name ${value} already exists`,
                        severity: vscode.InputBoxValidationSeverity.Error,
                    };
                }

                const similarEnv = env_names.find((env) =>
                    value.startsWith(env)
                );
                if (similarEnv) {
                    return {
                        message: `Warning: Environment name '${value}' is similar to an existing environment named: '${similarEnv}'`,
                        severity: vscode.InputBoxValidationSeverity.Warning,
                    };
                }
                let valid_regex = /^[a-z0-9\-]+$/;
                if (!valid_regex.test(value)) {
                    return "Environment name must contain only lowercase letters, numbers, and hyphens";
                }
                return null;
            },
        });

        if (!selected_env_name) {
            return;
        }

        progress.report({
            message: `Creating Environment: ${selected_env_name}`,
        });
        const selected_features_str = selected_features.join(" --feature ");
        const cmd = `${getPixiExecutablePath()} project environment add --manifest-path ${
            this.manifestPath
        } --feature ${selected_features_str} ${selected_env_name}`;

        info(`Creating environment with command: ${cmd}`);
        try {
            const output = await shell.execShellWithTimeout(cmd, 5000);
            info(output);
        } catch (error) {
            const errmsg = `Error creating environment: ${error}`;
            notify.errorUser(errmsg);
        }
    }

    /**
     * Executes a shell command to get Pixi info in JSON format.
     * Non-obvious: Uses a strict timeout to avoid unforeseen command hangs.
     */
    private async getPixiInfo(): Promise<PixiInfo | null> {
        try {
            const output = await shell.execShellWithTimeout(
                `${getPixiExecutablePath()} info --manifest-path ${
                    this.manifestPath
                } --json`,
                5000
            );
            this.pixiInfo = JSON.parse(output) as PixiInfo;
            return this.pixiInfo;
        } catch (error) {
            warn("Error executing shell command", error);
            return null;
        }
    }

    /**
     * Logs structured information about the current Pixi project.
     */
    private logPixiInfo(info: PixiInfo): void {
        debug(`Pixi Info: ${this.manifestPath}`, {
            project_name: info.project_info.name,
            environments: info.environments_info.map((env) => ({
                name: env.name,
                features: env.features.length,
                tasks: env.tasks.length,
                dependencies: `conda: ${env.dependencies.length} + pypi: ${env.pypi_dependencies.length}`,
            })),
        });
    }

    /**
     * Gets the name of the current Pixi project.
     * Non-obvious: Returns an empty string if the project is not fully valid.
     */
    public get name(): string {
        return this.pixiInfo?.project_info?.name || "";
    }

    /**
     * Gathers all unique features from every environment.
     * Non-obvious: Sorting ensures predictable behavior in UI listings.
     */
    public get featureNames(): string[] {
        const featureSet = new Set<string>();
        this.pixiInfo?.environments_info.forEach((env) => {
            env.features.forEach((feature) => featureSet.add(feature));
        });
        return Array.from(featureSet).sort();
    }
}
