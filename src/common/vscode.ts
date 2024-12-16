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