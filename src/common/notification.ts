import * as vscode from "vscode";
import { EXTENSION_NAME } from './constants';

export function formatMessage(message: string): string {
	return `${EXTENSION_NAME}: ${message}`;
}

export function info(message: string): void {
	vscode.window.showInformationMessage(formatMessage(message));
}

export function warn(message: string): void {
	vscode.window.showWarningMessage(formatMessage(message));
}

export function error(message: string): void {
	vscode.window.showErrorMessage(formatMessage(message));
}
