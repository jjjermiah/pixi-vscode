import {
  commands,
  ConfigurationScope,
  Disposable,
  LogOutputChannel,
  TextEditor,
  Uri,
  window,
  workspace,
  WorkspaceConfiguration,
  WorkspaceFolder,
} from 'vscode';


/**
 * Creates a new output channel with the specified name.
 * 
 * @param name - The name of the output channel.
 * @returns A LogOutputChannel instance.
 * 
 * Example usage:
 * const outputChannel = createOutputChannel('MyExtension');
 * outputChannel.appendLine('This is a log message');
 */
export function createOutputChannel(name: string): LogOutputChannel {
  return window.createOutputChannel(name, { log: true });
}

/**
 * Retrieves the configuration for the specified section.
 * When a scope is provided configuration confined to that scope is returned. Scope can be a resource or a language identifier or both.
 *
 * @param section A dot-separated identifier.
 * @param scope A scope for which the configuration is asked for.
 * @returns A WorkspaceConfiguration instance.
 * 
 * Example usage:
 * const config = getConfiguration('myExtension');
 * const settingValue = config.get('mySetting');
 */
export function getConfiguration(section: string, scope?: ConfigurationScope): WorkspaceConfiguration {
  return workspace.getConfiguration(section, scope);
}

/**
 * Registers a command that can be invoked via the command palette or keybindings.
 * 
 * @param command - The identifier of the command.
 * @param callback - The callback function to execute when the command is invoked.
 * @param thisArg - Optional 'this' context for the callback.
 * @returns A Disposable that unregisters the command when disposed.
 * 
 * Example usage:
 * registerCommand('myExtension.sayHello', () => {
 *   window.showInformationMessage('Hello, World!');
 * });
 */
export function registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
  return commands.registerCommand(command, callback, thisArg);
}

/**
 * Checks if the current workspace is a virtual workspace.
 * 
 * @returns True if the workspace is virtual, false otherwise.
 * 
 * Example usage:
 * if (isVirtualWorkspace()) {
 *   window.showWarningMessage('This extension may not work properly in a virtual workspace.');
 * }
 */
export function isVirtualWorkspace(): boolean {
  const isVirtual = workspace.workspaceFolders && workspace.workspaceFolders.every((f) => f.uri.scheme !== 'file');
  return !!isVirtual;
}

/**
 * Retrieves the list of workspace folders.
 * 
 * @returns An array of WorkspaceFolder instances.
 * 
 * Example usage:
 * const folders = getWorkspaceFolders();
 * folders.forEach(folder => {
 *   console.log(`Workspace folder: ${folder.name}`);
 * });
 */
export function getWorkspaceFolders(): readonly WorkspaceFolder[] {
  return workspace.workspaceFolders ?? [];
}

/**
 * Retrieves the workspace folder for a given URI.
 * 
 * @param uri - The URI to find the workspace folder for.
 * @returns The WorkspaceFolder instance or undefined if not found.
 * 
 * Example usage:
 * const folder = getWorkspaceFolder(Uri.parse('file:///path/to/file'));
 * if (folder) {
 *   console.log(`File is in workspace folder: ${folder.name}`);
 * }
 */
export function getWorkspaceFolder(uri: Uri): WorkspaceFolder | undefined {
  return workspace.getWorkspaceFolder(uri);
}

/**
 * Retrieves the currently active text editor.
 * 
 * @returns The active TextEditor instance or undefined if no editor is active.
 * 
 * Example usage:
 * const editor = getActiveTextEditor();
 * if (editor) {
 *   console.log(`Active editor file: ${editor.document.fileName}`);
 * }
 */
export function getActiveTextEditor(): TextEditor | undefined {
  return window.activeTextEditor;
}