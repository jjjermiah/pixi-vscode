/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { getEnvExtApi } from "./pythonEnvsApi";
import { registerLogger } from "./common/logging";
import { EXTENSION_NAME } from "./common/constants";
import { findPixiProjects } from "./managers/pixi_finder";
import { Pixi } from "./managers/pixiAPI";
import { PixiPackageManager } from "./managers/pixiPackageManager";
import { PixiEnvironmentManager } from "./managers/pixiEnvironmentManager";
import * as log from "./common/logging";
import * as notify from "./common/notification";
// import { PixiTaskProvider } from "./taskProvider/pixiTaskProvider";
// import { PixiWorkspaceInitializer } from "./initPixiWorkspace";

const Cache = require("vscode-cache");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    /// ---------------------------------------------------------------------------------------------
    // Create a Log output channel
    const outputChannel: vscode.LogOutputChannel =
        vscode.window.createOutputChannel(EXTENSION_NAME, { log: true });
    context.subscriptions.push(outputChannel, registerLogger(outputChannel));

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "pixi-vscode.viewLogs",
            outputChannel.show.bind(outputChannel)
        ),
        vscode.commands.registerCommand(
            "pixi-vscode.clearLogs",
            outputChannel.clear.bind(outputChannel)
        )
    );
    /// ---------------------------------------------------------------------------------------------

    // Create a new cache instance
    const cache = new Cache(context);

    // Find Pixi projects in the workspace
    let pixi_projects = await findPixiProjects();

    // Tell user
    if (pixi_projects.length === 0) {
        // warn("No Pixi projects found in workspace");
        // return;
        log.info("No Pixi projects found in workspace");
    } else {
        log.info(
            `Extension Activation: Found ${pixi_projects.length} pixi projects:`,
            pixi_projects
        );
    }

    // register a command to find pixi projects
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "pixi-vscode.findPixiProjects",
            async () => {
                pixi_projects = await findPixiProjects();
                if (pixi_projects.length === 0) {
                    log.info("No Pixi projects found in workspace");
                } else {
                    log.info(
                        `Found ${pixi_projects.length} pixi projects:`,
                        pixi_projects
                    );
                }
            }
        )
    );

    /// ---------------------------------------------------------------------------------------------
    // Python Environments API
    const api = await getEnvExtApi();

    let all_pixis: Pixi[] = pixi_projects.map((project) => new Pixi(project));
    const envManager = new PixiEnvironmentManager(
        outputChannel,
        all_pixis,
        api
    );
    log.info(
        `Extension Activation: Pixi Environment Manager initialized with ${all_pixis.length} pixi projects`
    );

    const packageManager = new PixiPackageManager(api, outputChannel);
    context.subscriptions.push(api.registerPackageManager(packageManager));
    context.subscriptions.push(api.registerEnvironmentManager(envManager));

    // const packageManager = new PixiPackageManager(api, outputChannel);
    // context.subscriptions.push(api.registerPackageManager(packageManager));
    // // Register the Pixi Task Provider
    // context.subscriptions.push(
    //   vscode.tasks.registerTaskProvider(
    //     "Pixi",
    //     new PixiTaskProvider(pixi_projects)
    //   )
    // );

    // const workspaceInitializer = new PixiWorkspaceInitializer(
    //   cache,
    //   pixi_projects
    // );
    // Register the Pixi Init command
    // context.subscriptions.push(
    //   vscode.commands.registerCommand("pixi-vscode.init", async () => {
    //     await workspaceInitializer.initPixiWorkspace();
    //   })
    // );
}

// This method is called when your extension is deactivated
export function deactivate() {}
