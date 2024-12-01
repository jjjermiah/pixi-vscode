import * as path from "path";
import * as vscode from "vscode";
import { Pixi } from "../managers/pixi";

import { PixiPlatform, PixiProjectType } from "../enums";
import { EnvFeatureTaskList, Feature, TaskInfo } from "../types";
import { execShellWithTimeout } from "../common/shell";
import * as log from "../common/logging";
import { PixiToolPath } from "../config";
import { getWorkspaceFolder } from "../common/vscode";
import { env } from "process";

export interface PixiTaskDefinition extends vscode.TaskDefinition {
  /**
   * The task name
   */
  task: string;

  /**
   * Possibly defined description of the task
   *
   * Extracted from the task info json
   */
  description?: string;

  /**
   * The defined command to run the task
   */
  cmd?: string;

  /**
   * The environment the task is associated with
   * Duplicated task names probably have different environments.
   */
  environment: string;

  /**
   * Feature name that task is defined under
   */
  feature: string;

  /**
   * Project associated with the task
   */
  project: string;

  /**
   * Manifest path associated with the task
   */
  manifestPath: string;

  /**
   *  TaskInfo object for reference in the future
   */
  taskInfo: TaskInfo;
}

export async function getPixiTasks(project: Pixi): Promise<vscode.Task[]> {
  let env_task_map: EnvFeatureTaskList[] = project.pixiTaskInfo;

  env_task_map.forEach((env) => {
    env.features.forEach((feature) => {
      feature.tasks.forEach((task) => {
        // console.log(task);
      });
    });
  });

  let result: vscode.Task[] = [];
  return result;
}

async function buildTaskDefinition(
  env_name: string,
  feature_name: string,
  task: TaskInfo,
): Promise<PixiTaskDefinition> {
  let taskDefinition: PixiTaskDefinition = {
    type: "pixi",
    task: task.name,
    environment: env_name,
    feature: feature_name,
    project: "",
    manifestPath: "",
    taskInfo: task,
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