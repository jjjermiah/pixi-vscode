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
	 * Possibly defined description of the task
	 */
	description?: string;

	/**
	 * The defined command to run the task
	 */
	cmd: string;
}

export interface TaskInfo {
	environment: string;
	tasks: Task[];
}

export interface Task {
	name: string;
	cmd: string;
	depends_on: string[];
	description: null;
	cwd: null;
	env: null;
	clean_env: boolean;
}


// let PixiPromise: Thenable<vscode.Task[]> | undefined = undefined;
export class PixiTaskProvider implements vscode.TaskProvider {
	static TaskType = "Pixi";
	private PixiPromise: Thenable<vscode.Task[]> | undefined = undefined;
	private PixiInfo: Promise<PixiInfo | undefined>;

	constructor() {
		this.PixiInfo = this.getPixiInfo();
		this.PixiInfo.then(info => {
			if (info) {
				console.log(info.project_info?.manifest_path);
			} else {
				console.error("Failed to retrieve PixiInfo");
			}
		});
		this.PixiInfo.then(async info => {
			const manifestPath = info?.project_info?.manifest_path;

			const fileWatcher = vscode.workspace.createFileSystemWatcher(manifestPath || '');
			fileWatcher.onDidChange(() => this.PixiPromise = this.getTasks());
			fileWatcher.onDidCreate(() => this.PixiPromise = this.getTasks());
			fileWatcher.onDidDelete(() => this.PixiPromise = this.getTasks());
		});

		this.PixiPromise = this.getTasks();
	}

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
		if (!this.PixiPromise) {
			this.PixiPromise = this.getTasks();
		}
		return this.PixiPromise;
	}

	public async getTasks(): Promise<vscode.Task[]> {
		const tasks: vscode.Task[] = [];
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			console.log("No workspace folders");
			return tasks;
		}

		const task_list = this.getPixiTaskInfo().then((info) => {
			if (!info) {
				console.error("Failed to retrieve PixiInfo");
				return [];
			}

			info.forEach((env) => {
				env.tasks.forEach((task) => {
					const task_def: vscode.TaskDefinition = {
						type: "Pixi",
						task: task.name,
						description: task.description,
						cmd: task.cmd,
					};

					const temp_task = new vscode.Task(
						task_def,
						workspaceFolders[0],
						task.name,
						"Pixi",
						new vscode.ShellExecution(`pixi run --environment ${env.environment} ${task.name}`)
					);

					// if task has a description, add it to the detail, if not use the cmd
					if (task.description) {
						temp_task.detail = `$(info) ${task.description}; $(terminal) ${task.cmd}`;
					} else {
						temp_task.detail = `$(terminal) ${task.cmd}`;
					}
					temp_task.source = `(${env.environment})`;

					if (task.name.toLowerCase().startsWith("test")) {
						temp_task.group = vscode.TaskGroup.Test;
					}
					if (task.name.toLowerCase().startsWith("build")) {
						temp_task.group = vscode.TaskGroup.Build;
					}
					tasks.push(temp_task);
				});
			});
		});
		return tasks;
	}

	public async getPixiTaskInfo(
		manifestPath?: string
	): Promise<TaskInfo[] | undefined> {
		const info = await execShellWithTimeout(
			`${PixiCommand.tool} task list --json`,
			5000,
			vscode.workspace.workspaceFolders?.[0].uri.fsPath || process.cwd()
		)
			.then((output) => JSON.parse(output) as TaskInfo[])
			.catch((error) => {
				return undefined;
			});
		return info;
	}


	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		return _task;
	}
}
