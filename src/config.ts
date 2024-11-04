import * as vscode from 'vscode';

export function getPixiExecutablePath(): string {
    const config = vscode.workspace.getConfiguration('pixi-vscode');
    const executablePath = config.get<string>('executablePath');
    return executablePath || 'pixi';
}
export const PixiToolPath = getPixiExecutablePath();
