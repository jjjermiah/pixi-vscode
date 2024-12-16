import {
  ConfigurationScope,
  TextEditor,
  window,
  workspace,
  WorkspaceConfiguration,
  QuickPickItem,
} from 'vscode';

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


/**
 * Displays a quick pick menu with the provided options and returns the selected
 * items as an array of strings.
 *
 * @param options - The options for the quick pick menu.
 * @returns A promise that resolves to an array of selected item labels.
 */

export async function showQuickPick(options: {
  title: string;
  placeholder: string;
  items: QuickPickItem[];
  canSelectMany: boolean;
  step?: number;
  totalSteps?: number;
  selectedItems?: QuickPickItem[];
  value?: string;
}): Promise<string[]> {
  const qp = window.createQuickPick(); // Add type parameter to createQuickPick
  qp.title = options.title;
  qp.placeholder = options.placeholder;
  qp.items = options.items;
  qp.canSelectMany = options.canSelectMany;
  if (options.step) qp.step = options.step;
  if (options.totalSteps) qp.totalSteps = options.totalSteps;
  if (options.selectedItems) qp.selectedItems = options.selectedItems;
  if (options.value) qp.value = options.value;
  qp.show();
  return new Promise((resolve) => {
    qp.onDidAccept(() => {
      let selections = qp.selectedItems;
      qp.dispose();
      resolve(selections.map((item) => item.label));
    });
  });
}

