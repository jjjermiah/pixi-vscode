# Pixi Support for Visual Studio Code
<div align="center">

<img src="https://github.com/jjjermiah/pixi-vscode/blob/main/assets/images/VSCode-Pixi-Logo.png?raw=true" alt="VSCode" width="220" height="220">

[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/jjjermiah.pixi-vscode
)](https://marketplace.visualstudio.com/items?itemName=jjjermiah.pixi-vscode)

This extension provides a set of tools for developing with [Pixi](https://pixi.sh) in Visual Studio Code.

</div>

> [!Note] 
> This extension is in early development and should not be considered stable.
> Please report any issues or feature requests to the [GitHub repository](https://github.com/jjjermiah/pixi-vscode).

## Features

**TODO List**

- [x] Initialize a new Pixi project
- [x] Add channels to an existing Pixi project
- [x] Add packages to an existing Pixi project
- [x] Set Python interpreter for a Pixi project
  - [ ] refactor to check for installed environments and if the python binary exists.
- [ ] Add platforms to an existing Pixi project
- [ ] Run tasks via cmd palette
- [ ] Add pypi packages to a Pixi project
- [ ] Install an environment from a Pixi project.
- [ ] Add functionality to handle `pixi.toml` and `pyproject.toml` files with [tool.pixi]

| Command Palette Command | Context Menu (right-click on folder)| Pixi Command | Description |
| --- | --- | --- | --- |
| `Pixi: Init` | `Pixi: Init` | `pixi init` | Initialize a new Pixi project through an interactive menu to choose project type, additional channels, and platforms. |
| `Pixi: Add Channel` | `Pixi: Add Channel` | `pixi add channel` | Add channels to an existing Pixi project through an interactive menu to choose from available public channels. |
| `Pixi: Add Package` | `Pixi: Add Package` | `pixi add package` | Add packages to an existing Pixi project through an interactive menu to choose from available packages. |
| `Pixi: Set Python Interpreter` | `unavailable` | `pixi set python` | Choose a environment from Pixi's environment list and set the Python interpreter for the workspace.
| `Pixi: Activate Environment in new Terminal` | `unavailable` | `pixi shell` | Choose an environment from the pixi project and activate it in a new terminal. |
| `Pixi: Clear Extension Cache` | `unavailable` | `pixi clear cache` | This extension stores previously selected channels and platforms in the extension's cache. This command clears the cache. |

### Pixi `init` Command

Initialize a new Pixi project from:

- Command Palette (`Ctrl+Shift+P` then `Pixi: Init`)
- Context Menu (`Right Click` on a folder then `Pixi: Init`)
- Explorer when no workspace is open (`New Pixi Project` button)

Interactively select the project type (`pixi` or `pyproject`), additional platforms, and additional channels to add to the project.

### Pixi `add channel` Command

Add channels to an existing Pixi project from:

- Command Palette (`Ctrl+Shift+P` then `Pixi: Add Channel`)
- Context Menu (`Right Click` on a folder then `Pixi: Add Channel`)

Uses the [Prefix.dev GraphQL API](https://prefix.dev/docs/prefix/graphql_api) to fetch available **public** channels and prompt the user to select one.
You can set the `pixi-vscode.defaultChannels` setting to include a list of channels that will be automatically be selected when the `Pixi: Add Channel` command is run.

> [!TIP]
> If you have custom channels hosted on Prefix.dev, you can add them to your project by add your
> API key to the `Pixi: Prefix API Key` setting in the VSCode settings.
> The extension will then include your private channels in the list of available channels.

### Pixi `add package` Command

Add packages to an existing Pixi project from:

- Command Palette (`Ctrl+Shift+P` then `Pixi: Add Package`)
- Context Menu (`Right Click` on a folder then `Pixi: Add Package`)

### Pixi `set Python Interpreter` Command

Given an opened Pixi project, choose from the project's environments to set the Python interpreter for the workspace.

- Command Palette (`Ctrl+Shift+P` then `Pixi: Set Python Interpreter`)

> [!WARNING]
> This command is only available when the Python extension is installed.
> This comman also requires for each environment to be installed with
> `pixi install -e <environment name>`.
> If you have not installed the environment, the command will behave unexpectedly.
