import * as vscode from "vscode";
import { EXTENSION_NAME } from "./constants";

export function formatMessage(message: string): string {
  return `${EXTENSION_NAME}: ${message}`;
}

/**
 * Displays an informational message to the user.
 *
 * @param message - The message to be displayed.
 */
export function infoUser(message: string): void {
  vscode.window.showInformationMessage(formatMessage(message));
}

/**
 * Displays a warning message to the user.
 *
 * @param message - The message to be displayed as a warning.
 */
export function warnUser(message: string): void {
  vscode.window.showWarningMessage(formatMessage(message));
}

/**
 * Displays an error message to the user.
 *
 * @param message - The error message to display.
 */
export function errorUser(message: string): void {
  vscode.window.showErrorMessage(formatMessage(message));
}
