import * as cp from "child_process";

/**
 * Executes a shell command and returns a promise that resolves with the command's output.
 * @param cmd - The shell command to execute.
 * @param cwd - The path to run the command in (optional).
 * @returns A promise that resolves with the output of the command.
 */
const execShell = (cmd: string, cwd?: string): Promise<string> => {
	return new Promise<string>((resolve, reject) => {
		cp.exec(cmd, { cwd }, (err, out) => {
			if (err) {
				reject(err);
			} else {
				resolve(out);
			}
		});
	});
};

/**
 * Executes a shell command with a specified timeout.
 *
 * @param cmd - The shell command to execute.
 * @param timeout - The timeout value in milliseconds.
 * @param cwd - The path to run the command in (optional).
 * @returns A promise that resolves with the command output or rejects with an error.
 *
 * @example
 * execShellWithTimeout("ls", 1000)
 *    .then((output) => console.log(output))
 *   .catch((error) => console.error(error));
 *
 * execShellWithTimeout("sleep 5", 1000)
 *   .then((output) => console.log(output))
 *  .catch((error) => console.error(error)); // Error: Command execution timed out
 */
export const execShellWithTimeout = (
	cmd: string,
	timeout: number,
	cwd?: string
): Promise<string> => {
	return new Promise<string>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error("Command execution timed out"));
		}, timeout);

		execShell(cmd, cwd)
			.then((output) => {
				clearTimeout(timeoutId);
				resolve(output);
			})
			.catch((error) => {
				clearTimeout(timeoutId);
				reject(error);
			});
	});
};
