import * as vscode from "vscode";
import * as log from "../common/logging";

export async function findPixiProjects(): Promise<string[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];

  log.debug(`Found ${workspaceFolders.length} workspace folders.`, workspaceFolders);

  const pixiProjects = await Promise.all(
    workspaceFolders.map(async (folder) => {
      const pixiLocks = await findPixiLocks(folder);
      const manifestPaths = await Promise.all(
        pixiLocks.map((pixiLock) => findManifestPath(pixiLock))
      );
      return manifestPaths;
    })
  );

  return pixiProjects.flat();
}



/**
 * Finds Pixi projects within the given workspace folder.
 *
 * This function searches for any `pixi.lock` file recursively within the workspace folder,
 * which is an indicator of a Pixi project. The presence of this file suggests that there
 * should be either a `pyproject.toml` or a `pixi.toml` file next to it.
 *
 * @param wsf - The workspace folder to search within.
 * @returns A promise that resolves to an array of URIs pointing to the found `pixi.lock` files.
 */
async function findPixiLocks(
  wsf: vscode.WorkspaceFolder
): Promise<vscode.Uri[]> {
  const projects = await vscode.workspace.findFiles(
    // find any `pixi.lock` file recursively, which is a sign of a Pixi project
    // Then next to it there should be either a pyproject.toml or a pixi.toml
    new vscode.RelativePattern(wsf, "**/pixi.lock")
  );
  return projects;
}

/**
 * Find the path of the manifest file (pixi.toml or pyproject.toml) given the path of the pixi.lock file
 *
 * @param pixiLockUri URI of the pixi.lock file
 * @returns  URI of the manifest file (pixi.toml or pyproject.toml)
 * @throws Error if neither pixi.toml nor pyproject.toml is found
 */
async function findManifestPath(
  pixiLockUri: vscode.Uri
): Promise<string> {
  const parentDir = vscode.Uri.joinPath(pixiLockUri, "..");

  // check if pixi.toml exists
  const pixiToml = vscode.Uri.joinPath(parentDir, "pixi.toml");
  if (
    await vscode.workspace.fs.stat(pixiToml).then(
      () => true,
      () => false
    )
  ) {
    return pixiToml.fsPath;
  }
  const pyprojectToml = vscode.Uri.joinPath(parentDir, "pyproject.toml");
  if (
    await vscode.workspace.fs.stat(pyprojectToml).then(
      () => true,
      () => false
    )
  ) {
    return pyprojectToml.fsPath;
  }

  throw new Error(
    "Neither pixi.toml nor pyproject.toml was found in the directory."
  );
}

