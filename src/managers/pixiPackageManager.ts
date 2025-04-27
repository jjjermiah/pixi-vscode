import {
    PackageManager,
    PythonEnvironment,
    DidChangePackagesEventArgs,
    Package,
    PackageChangeKind,
    PythonEnvironmentApi,
    RefreshEnvironmentsScope,
    ResolveEnvironmentContext,
    SetEnvironmentScope,
    PackageManagementOptions,
} from "../api";
import {
    Event,
    EventEmitter,
    LogOutputChannel,
    ProgressLocation,
    ThemeIcon,
    window,
} from "vscode";
import { Pixi } from "./pixiAPI";
import { execShellWithTimeout } from "../common/shell";
import { withProgress } from "../common/windowAPI";
import { PixiPythonEnvironment } from "./pixiEnvironmentManager";
import { PixiPackageList } from "../types/package_info";
import * as log from "../common/logging";
// import { PrefixClient } from "../prefixAPI/prefix-client";

export async function refreshPackages(
    environment: PixiPythonEnvironment,
    api: PythonEnvironmentApi,
    manager: PackageManager
): Promise<Package[]> {
    // list --json-pretty --no-lockfile-update --frozen
    let args = [
        "list",
        "--json-pretty",
        "--no-lockfile-update",
        "--frozen",
        "--manifest-path",
        environment.pixi.manifestPath,
    ];
    log.debug("pixi list args:", args);
    const data = await execShellWithTimeout(`pixi ${args.join(" ")}`, 5000);
    const content = JSON.parse(data) as PixiPackageList[];
    log.debug("pixi list output:", content[0]);

    const packages: Package[] = [];
    content.forEach((l) => {
        const pkg = api.createPackageItem(
            {
                name: l.name,
                displayName: l.name,
                version: l.version,
                description: l.version,
                iconPath: l.is_explicit
                    ? new ThemeIcon("star-full")
                    : undefined,
            },
            environment,
            manager
        );
        packages.push(pkg);
    });
    return packages;
}

export class PixiPackageManager implements PackageManager {
    readonly name = "pixi";
    readonly displayName = "Pixi";
    readonly description = "Manage packages using the Pixi package manager";
    readonly tooltip = "Pixi package manager";
    readonly log: LogOutputChannel;
    // private prefixClient: PrefixClient = new PrefixClient();

    private packages: Map<string, Package[]> = new Map();

    constructor(
        public readonly api: PythonEnvironmentApi,
        log: LogOutputChannel
    ) {
        this.log = log;
    }

    private readonly _onDidChangePackages =
        new EventEmitter<DidChangePackagesEventArgs>();

    // /**
    //  * Event that is fired when packages change.
    //  */
    readonly onDidChangePackages: Event<DidChangePackagesEventArgs> =
        this._onDidChangePackages.event;

    /**
     * Installs/Uninstall packages in the specified Python environment.
     * @param environment - The Python environment in which to install packages.
     * @param options - Options for managing packages.
     * @returns A promise that resolves when the installation is complete.
     */
    async manage(
        environment: PythonEnvironment,
        options: PackageManagementOptions
    ): Promise<void> {
        throw new Error("'manage' method not implemented.");
    }

    /**
     * Refreshes the package list for the specified Python environment.
     * @param environment - The Python environment for which to refresh the package list.
     * @returns A promise that resolves when the refresh is complete.
     */
    async refresh(environment: PythonEnvironment): Promise<void> {
        await withProgress(
            {
                location: ProgressLocation.Window,
                title: "Refreshing packages",
            },
            async () => {
                this.packages.set(
                    environment.envId.id,
                    await refreshPackages(
                        environment as PixiPythonEnvironment,
                        this.api,
                        this
                    )
                );
            }
        );
    }

    /**
     * Retrieves the list of packages for the specified Python environment.
     * @param environment - The Python environment for which to retrieve packages.
     * @returns An array of packages, or undefined if the packages could not be retrieved.
     */
    async getPackages(
        environment: PythonEnvironment
    ): Promise<Package[] | undefined> {
        if (!this.packages.has(environment.envId.id)) {
            await this.refresh(environment);
        }
        return this.packages.get(environment.envId.id);
    }

    /**
     * Clears the package manager's cache.
     * @returns A promise that resolves when the cache is cleared.
     */
    clearCache?(): Promise<void> {
        throw new Error("'clearCache' method not implemented.");
    }
}
