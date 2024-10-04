import * as path from "path";
import * as vscode from "vscode";
import { Pixi } from "./environmentManagers/pixi";
import { PixiPlatform, PixiCommand, PixiProjectType } from "./enums";
import { PixiInfo } from "./types";
import { execShellWithTimeout } from "./common/shell";

interface PixiTaskDefinition extends vscode.TaskDefinition {
	/**
	 * The task name
	 */
	task: string;

	/**
	 * The rake file containing the task
	 */
	file?: string;
}

export class PixiTaskProvider implements vscode.TaskProvider {
	private pixiPromise: Thenable<vscode.Task[]> | undefined = undefined;

	static TaskType = "Pixi";

	public async getPixiInfo(
		manifestPath?: string
	): Promise<PixiInfo | undefined> {
		const info = await execShellWithTimeout(
			`${PixiCommand.tool} info --json`,
			5000,
			vscode.workspace.workspaceFolders?.[0].uri.fsPath || process.cwd()
		)
			.then((output) => JSON.parse(output) as PixiInfo)
			.catch((error) => {
				console.error(error);
				return undefined;
			});
		return info;
	}

	provideTasks(
		token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.Task[]> {
		return this.getTasks();
	}

	public async getTasks(): Promise<vscode.Task[]> {
		const tasks: vscode.Task[] = [];
		// if (!this.pixiPromise) {
		// console.log("Pixi Promise is not defined");
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			console.log("No workspace folders");
			return tasks;
		}
		for (const workspaceFolder of workspaceFolders) {
			const folderString = workspaceFolder.uri.fsPath;
			if (!folderString) {
				console.log("No folder string");
				continue;
			}
			// wait for the pixi info to be retrieved
			const task_list = this.getPixiInfo().then((info) => {
				if (!info) {
					console.error("Failed to retrieve PixiInfo");
					3;
					return [];
				}
				const manifestPath = info?.project_info?.manifest_path;
				const temp_task_list: vscode.Task[] = [];
				info.environments_info.forEach((env) => {
					for (const taskName_temp of env.tasks) {
						const taskName = `${taskName_temp} in *${env.name}*`;
						const temp_task = new vscode.Task(
							{
								type: "Pixi",
								task: taskName,
							},
							workspaceFolder,
							taskName,
							"Pixi",
							new vscode.ShellExecution(`pixi run ${taskName_temp}`)
						);
						if ("build" === taskName) {
							temp_task.group = vscode.TaskGroup.Build;
						}
						if ("test" === taskName) {
							temp_task.group = vscode.TaskGroup.Test;
						}
						if ("ruff" === taskName) {
							temp_task.group = vscode.TaskGroup.Test;
						}
						temp_task.detail = `$(terminal) ${taskName}`;
						temp_task.source = "Whatever";

						temp_task_list.push(temp_task);
						const numtasks = temp_task_list.length;
					}
				});
				console.log(`Found ${temp_task_list.length} tasks`);
				return temp_task_list;
			});

			// console.log(`found ${task_list.length} tasks`);
			// add the tasks to the list
			return task_list;
		}

		// combine the task lists

		return tasks;
		// } else {
		// 	console.log("Pixi Promise is defined");
		// }
	}

	// resolveTask(
	// 	_task: vscode.Task,
	// 	token: vscode.CancellationToken
	// ): vscode.ProviderResult<vscode.Task> {

	// 	return task;
	// }
	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		const task = _task.definition.task;
		// A Rake task consists of a task and an optional file as specified in RakeTaskDefinition
		// Make sure that this looks like a Rake task by checking that there is a task.
		if (task) {
			// resolveTask requires that the same definition object be used.
			const definition: PixiTaskDefinition = <any>_task.definition;
			return new vscode.Task(
				definition,
				_task.scope ?? vscode.TaskScope.Workspace,
				definition.task,
				"Pixi",
				new vscode.ShellExecution(`pixi run ${definition.task}`)
			);
		}
		return undefined;
	}
}
