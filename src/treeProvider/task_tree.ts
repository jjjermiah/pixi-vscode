import * as vscode from "vscode";
import { traceError } from "../common/logging";
import { getWorkspaceFolder } from "../common/vscode";
import { PixiTaskDefinition } from "../taskProvider/pixiTaskProvider";
class PixiTask extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly state: vscode.TreeItemCollapsibleState,
    public readonly description: string,
    public readonly type: string,
    public readonly task?: vscode.Task,
    public readonly scope?: vscode.WorkspaceFolder,
    public readonly project?: string,
    public iconPath?: vscode.ThemeIcon
  ) {
    super(label, state);
    this.description = description;
    this.task = task;
    this.type = type;
    this.scope = scope;
    this.project = project;
  }
}

// TODO:: implement onDidChangeTreeData, getParent, resolveTreeItem
export class PixiTaskTreeProvider implements vscode.TreeDataProvider<PixiTask> {
  private allTasks: vscode.Task[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const taskFilter: vscode.TaskFilter = {
      type: "Pixi",
      // workspaceFolder: workspaceFolders[0],
    };
    this.allTasks = await vscode.tasks.fetchTasks({ type: "Pixi" });
  }

  getTreeItem(element: PixiTask): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PixiTask): Promise<PixiTask[]> {
    if (!element) {
      return this.getTopLevelItems().then((scopes) =>
        scopes.map((scope) => {
          let task = new PixiTask(
            `${scope.name}`,
            vscode.TreeItemCollapsibleState.Expanded,
            "", //scope.uri.toString(),
            "workspaceFolder",
            undefined,
            scope
          );
          task.iconPath = new vscode.ThemeIcon("folder-library");
          return task;
        })
      );
    }
    if (this.allTasks.length === 0) {
      vscode.tasks
        .fetchTasks({
          type: "Pixi",
        })
        .then((tasks) => {
          this.allTasks = tasks;
        });
    }
    if (element.type === "workspaceFolder") {
      return this.filterTasksByScope(element.scope!).then((tasks_in_scope) => {
        let unique_Projects = new Set<string>(
          tasks_in_scope.map((task) => task.definition.project)

        );
        return Array.from(unique_Projects).map(
          (project) =>
            new PixiTask(
              project,
              vscode.TreeItemCollapsibleState.Collapsed,
              "",
              "project",
              undefined,
              element.scope!,
              undefined,
              new vscode.ThemeIcon("folder")
            )
        );
      });
    }

    if (element.type === "project") {
      let all_envs = this.allTasks.map((task: vscode.Task) => {
        if (task.definition.project === element.label) {
          return task.definition.environment;
        }
      });
      let unique_envs = new Set<string>(all_envs.map((env) => env));
      return Promise.resolve(
        Array.from(unique_envs)
          .filter((env) => env !== "" && env !== undefined)
          .map(
            (env) =>
              new PixiTask(
                env,
                vscode.TreeItemCollapsibleState.Collapsed,
                "",
                "environment",
                undefined,
                element.scope!,
                element.label,
                new vscode.ThemeIcon("runtime-extensions-editor-label-icon")
              )
          )
      );
    }

    if (element.type === "environment") {
      let all_tasks: vscode.Task[] = this.allTasks
        .map((task: vscode.Task) => {
          if (
            task.definition.environment === element.label &&
            task.definition.project === element.project
          ) {
            return task;
          }
        })
        .filter((task): task is vscode.Task => task !== undefined);
      return Promise.resolve(
        all_tasks.map((task) => {
          if (
            task.definition.description === undefined ||
            task.definition.description === ""
          ) {
            task.definition.description = task.definition.cmd;
          }

          let pixitask = new PixiTask(
            task.definition.task,
            vscode.TreeItemCollapsibleState.None,
            task.definition.description,
            "task",
            task,
            element.scope!
          );
          pixitask.tooltip = generateMarkdownString(task);
          return pixitask;
        })
      );
    }

    return Promise.resolve([]);
  }

  async getTopLevelItems(): Promise<vscode.WorkspaceFolder[]> {
    const taskFilter: vscode.TaskFilter = {
      type: "Pixi",
    };

    if (this.allTasks.length === 0) {
      this.allTasks = await vscode.tasks.fetchTasks(taskFilter);
    }

    const uniqueScopes = new Set<vscode.WorkspaceFolder>(
      this.allTasks
        .map((task) => task.scope)
        .filter(
          (scope): scope is vscode.WorkspaceFolder =>
            scope !== undefined &&
            scope !== vscode.TaskScope.Global &&
            scope !== vscode.TaskScope.Workspace
        )
    );

    return [...uniqueScopes];
  }

  async filterTasksByScope(
    scope: vscode.WorkspaceFolder
  ): Promise<vscode.Task[]> {
    if (this.allTasks.length === 0) {
      this.allTasks = await vscode.tasks.fetchTasks({
        type: "Pixi",
      });
    }
    return this.allTasks.filter((task) => task.scope === scope);
  }
}

function getWorkspaceFolderFromManifestPath(
  manifestPath: string
): vscode.WorkspaceFolder | undefined {
  const manifestUri = vscode.Uri.parse(manifestPath);
  if (manifestUri.scheme !== "file") {
    traceError(
      `TaskTreeProvider: Manifest path is not a file: ${manifestPath}`
    );
    return;
  }
  if (!manifestUri) {
    traceError(
      `TaskTreeProvider: Manifest path is not a file: ${manifestPath}`
    );
    return;
  }
  let wsf = getWorkspaceFolder(manifestUri);
  if (!wsf) {
    traceError(
      `TaskTreeProvider: WorkspaceFolder not found for manifest path: ${manifestPath}`
    );
    return;
  }
  return wsf;
}

function generateMarkdownString(task: vscode.Task): vscode.MarkdownString {
  let markdownString = `# **Task Name:** ${task.definition.task}\n\n`;
  markdownString += `**Description:** ${task.definition.description}\n\n`;
  markdownString += `**Command:** ${task.definition.cmd}\n\n`;
  markdownString += `**Environment:** ${task.definition.environment}\n\n`;
  markdownString += `**Project:** ${task.definition.project}\n\n`;
  markdownString += `**Manifest Path:** ${task.definition.manifestPath}\n\n`;

  let convertedString = new vscode.MarkdownString(markdownString);
  return convertedString;
}
