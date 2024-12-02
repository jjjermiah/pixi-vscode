import * as vscode from "vscode";
import { Pixi } from "../managers/pixi";

import { EnvFeatureTaskList, Feature, TaskInfo } from "../types";
import * as log from "../common/logging";
import { PixiToolPath } from "../config";
import { getWorkspaceFolder } from "../common/vscode";
import { PixiTaskDefinition } from "./pixiTaskDefinition";

export class PixiTaskProvider implements vscode.TaskProvider {
  private static pixiProjects: Pixi[];
  private pixiPromises: Map<Pixi, Thenable<vscode.Task[]>> | undefined = undefined;

  constructor(private readonly pixiProjects: Pixi[]) {
    log.debug(
      "Initializing PixiTaskProvider with projects",
      pixiProjects.map((p) => p.pixiInfo.project_info.name)
    );
    this.pixiProjects = pixiProjects;

    // Initialize Pixi promises
    this.pixiPromises = new Map(
      this.pixiProjects.map((project) => [project, getPixiTasks(project)])
    );

    // Watch for changes to the manifest files
    for (const project of pixiProjects) {
      const fileWatcher = vscode.workspace.createFileSystemWatcher(
        project.manifestPath || ""
      );

      fileWatcher.onDidChange(async () => {
        log.debug("Manifest file changed for ", project.manifestPath);
        this.pixiPromises = undefined;
      });
      fileWatcher.onDidDelete(async () => {
        log.error(`Manifest file ${project.manifestPath} was deleted`);
        this.pixiPromises = undefined;
      });
    }
  }

  public async provideTasks(
    token: vscode.CancellationToken
  ): Promise<vscode.Task[]> {
    log.info("Providing Pixi tasks...");
    if (!this.pixiPromises) {
      log.info("Pixi promises not initialized, initializing...");
      this.pixiPromises = new Map(
        await Promise.all(
          this.pixiProjects.map(async (project) => {
            const tasks = await getPixiTasks(project);
            return [project, Promise.resolve(tasks)] as [Pixi, Thenable<vscode.Task[]>];
          })
        )
      );
    }
    return await this.aggregatePixiTasks();
  }

  private async aggregatePixiTasks() {
    let allTasks: vscode.Task[] = [];
    for (const promise of (this.pixiPromises?.values() || [])) {
      allTasks = allTasks.concat(await promise);
    }
    log.debug(`There are ${allTasks.length} tasks available`);
    return allTasks;
  }

  public resolveTask(
    task: vscode.Task,
    token?: vscode.CancellationToken
  ): vscode.Task | undefined {
    log.debug("Resolving task", task.definition);
    return task;
  }
}

/**
 * Retrieves Pixi tasks for a given project.
 *
 * @param project - The Pixi project instance.
 * @returns A promise that resolves to an array of vscode.Task objects.
 */
export async function getPixiTasks(project: Pixi): Promise<vscode.Task[]> {
	const tasks: Promise<vscode.Task | undefined>[] = [];

  // first, force the pixi to re-fetch the task info
  log.debug("Fetching Pixi tasks for", project.manifestPath);
  await project.getPixiTaskEnvironments(true);

	// Iterate through environments, features, and tasks
	for (const env of project.pixiTaskInfo) {
		for (const feature of env.features) {
			for (const task of feature.tasks) {
				// Skip tasks starting with `_` early
				if (task.name.startsWith("_")) {
					continue;
				}

				// Push task promises to the array
				tasks.push(
					buildPixiTask(env, feature, task, project)
				);
			}
		}
	}

	// Resolve all task promises in parallel
	const resolvedTasks = (await Promise.all(tasks)).filter(
		(task): task is vscode.Task => task !== undefined
	);

	// Enhance task metadata
	for (const task of resolvedTasks) {
		task.detail = createTaskDetail(task);
		task.source = `Pixi (${task.definition.environment})`;

		// Assign task group (non-blocking)
		determineTaskGroup(task.definition as PixiTaskDefinition).then((group) => {
			if (group) {
				task.group = group;
			}
		});
	}

	return resolvedTasks;
}

function buildPixiTask(env: EnvFeatureTaskList, feature: Feature, task: TaskInfo, project: Pixi): Promise<vscode.Task | undefined> {
  return buildTaskDefinition(
    env.environment,
    feature.name,
    task,
    project.manifestPath,
    project.pixiInfo.project_info.name
  ).then((taskDefinition) => {
    return new vscode.Task(
      taskDefinition,
      vscode.TaskScope.Workspace,
      taskDefinition.task,
      "Pixi",
      new vscode.ShellExecution(
        `${PixiToolPath} run --manifest-path ${taskDefinition.manifestPath} --environment ${taskDefinition.environment} ${taskDefinition.task}`,
        {
          cwd: getWorkspaceFolder(vscode.Uri.file(project.manifestPath))
            ?.uri.fsPath,
        }
      )
    );
  });
}


/**
 * Builds a PixiTaskDefinition object.
 *
 * @param env_name - The name of the environment.
 * @param feature_name - The name of the feature.
 * @param task - The task information.
 * @param manifestPath - The path to the manifest file.
 * @param projectName - The name of the project.
 * @returns A promise that resolves to a PixiTaskDefinition object.
 */
async function buildTaskDefinition(
  env_name: string,
  feature_name: string,
  task: TaskInfo,
  manifestPath: string,
  projectName: string
): Promise<PixiTaskDefinition> {
  let taskDefinition: PixiTaskDefinition = {
    task: task.name,
    environment: env_name,
    feature: feature_name,
    project: projectName,
    manifestPath: manifestPath,
    taskInfo: task,
    type: "Pixi",
  };

  // Alias tasks dont have an actual command, but rather depend on other tasks
  if (task.cmd) {
    taskDefinition.cmd = task.cmd;
  }

  if (task.description) {
    taskDefinition.description = task.description;
  }

  return taskDefinition;
}


// Map of matches to task groups
const taskGroups: [string[], vscode.TaskGroup][] = [
  [["build", "compile", "make", "install"], vscode.TaskGroup.Build],
  [["test", "check", "lint", "coverage"], vscode.TaskGroup.Test],
  [["clean"], vscode.TaskGroup.Clean],
];

/**
 * Creates a detailed string representation of a given VSCode task.
 *
 * This function generates a string that includes the command to be executed
 * for the task, and optionally includes a description if provided. The command
 * string is formatted with appropriate icons for terminal commands or task dependencies.
 *
 * @param {vscode.Task} task - The VSCode task for which the detail string is created.
 * @returns {string} A detailed string representation of the task, including the command
 * and optionally the description.
 */
function createTaskDetail(task: vscode.Task): string{
  let cmd_string = task.definition.cmd ? `$(terminal) ${task.definition.cmd}` : `$(references) ${task.definition.taskInfo.depends_on.join(" && ")}`;
  let detail =  task.definition.description ? `$(info) ${task.definition.description}; ${cmd_string}` : cmd_string
  console.log("Task Detail", detail);
  return detail;
}



/**
 * Based on the task name, or feature name, determine the task group.
 *
 * @param taskDef
 * @returns vscode.TaskGroup
 */
async function determineTaskGroup(
  taskDef: PixiTaskDefinition
): Promise<vscode.TaskGroup | undefined> {
  const taskName = taskDef.task.toLowerCase();
  const featureName = taskDef.feature.toLowerCase();

  // Iterate through the task groups and find the first match
  for (const [keywords, group] of taskGroups) {
    if (
      keywords.some(
        (keyword) => taskName.includes(keyword) || featureName.includes(keyword)
      )
    ) {
      return group;
    }
  }

  return undefined;
}