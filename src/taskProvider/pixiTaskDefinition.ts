import { TaskDefinition } from "vscode";
import { TaskInfo } from "../types";

export interface PixiTaskDefinition extends TaskDefinition {
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