import * as path from "path";
import * as vscode from "vscode";
import { Pixi } from "../managers/pixi";
import { PixiPlatform, PixiProjectType } from "../enums";
import { PixiInfo } from "../types";
import { execShellWithTimeout } from "../common/shell";
import {
  registerLogger,
  traceError,
  traceLog,
  traceVerbose,
  traceInfo,
} from "../common/logging";
import { PixiToolPath } from "../config";
import { getWorkspaceFolder } from "../common/vscode";
export interface PixiTaskDefinition extends vscode.TaskDefinition {
  /**
   * The task name
   */
  task: string;

  /**
   * Possibly defined description of the task
   */
  description?: string;

  /**
   * The defined command to run the task
   */
  cmd: string;

  /**
   * The environment the task is associated with
   * Duplicated tasks will probably have unique environments!
   */
  environment: string;

  /**
   * Project associated with the task
   */
  project: string;

  /**
   * Manifest path associated with the task
   */
  manifestPath: string;
}

// let PixiPromise: Thenable<vscode.Task[]> | undefined = undefined;
export class PixiTaskProvider implements vscode.TaskProvider {
  private static pixiProjects: Pixi[];

  constructor(private readonly pixiProjects: Pixi[]) {
    this.pixiProjects = pixiProjects;
  }

  public async provideTasks(
    token: vscode.CancellationToken
  ): Promise<vscode.Task[]> {
    const allTaks: vscode.Task[] = [];
    // TODO: attach workspace Folder to the Pixi Projects instead of using the first one
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      traceError("No workspace folders found...");
      return allTaks;
    }

    const allTaskDefinitions: vscode.TaskDefinition[] = [];

    const taskPromises = this.pixiProjects.map(async (pixi) => {
      const projectName = pixi.projectName();

      const info = await pixi.getPixiTaskEnvironments();
      if (!info) {
        traceError(`Failed to retrieve PixiInfo for ${projectName}`);
        return;
      }

      info.forEach((env) => {
        env.tasks.forEach((taskinfo) => {
          const task: PixiTaskDefinition = {
            type: "Pixi",
            task: taskinfo.name,
            description: taskinfo.description ?? "",
            cmd: taskinfo.cmd,
            environment: env.environment,
            project: projectName,
            manifestPath: pixi.manifestPath,
          };
          allTaskDefinitions.push(task);
        });
      });
    });

    await Promise.all(taskPromises);

    const taskDefPromises = allTaskDefinitions.map(async (taskDef) => {
      // create uri from manifestPath
      // if manifestPath is not a uri, create a uri from it
      // if manifestPath is a uri, use it as is
      const manifestUri = vscode.Uri.parse(taskDef.manifestPath);
      if (manifestUri.scheme !== "file") {
        traceError(
          `TaskProvider: Manifest path is not a file: ${taskDef.manifestPath}`
        );
        return;
      }
      if (!manifestUri) {
        traceError(
          `TaskProvider: Manifest path is not a file: ${taskDef.manifestPath}`
        );
        return;
      }
      let wsf = await getWorkspaceFolder(manifestUri);
      if (!wsf) {
        traceError(
          `TaskProvider: WorkspaceFolder not found for manifest path: ${taskDef.manifestPath}`
        );
        return;
      }

      let task = new vscode.Task(
        taskDef,
        wsf,
        taskDef.task,
        "Pixi",
        new vscode.ShellExecution(
          `${PixiToolPath} run --manifest-path ${taskDef.manifestPath} --environment ${taskDef.environment} ${taskDef.task}`
        )
      );

      // if task has a description, add it to the detail, if not use the cmd
      if (taskDef.description) {
        task.detail = `$(info) ${taskDef.description}; $(terminal) ${taskDef.cmd}`;
      } else {
        task.detail = `$(terminal) ${taskDef.cmd}`;
      }
      // task.source = `(${taskDef.project}::${taskDef.environment})`;
      task.source = `(${taskDef.environment})`;

      allTaks.push(task);
    });

    await Promise.all(taskDefPromises);
    traceLog(`TaskProvider: Num tasks: ${allTaks.length} from ${allTaskDefinitions.length}`);
    return allTaks;
  }

  public resolveTask(_task: vscode.Task): vscode.Task | undefined {
    return _task;
  }
}
