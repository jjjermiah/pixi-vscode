import * as assert from "assert";
import { execShellWithTimeout } from "../common/shell";

suite("Shell Test Suite", () => {
	test("execShellWithTimeout should resolve with command output", async () => {
		const output = await execShellWithTimeout('echo "Hello, World!"', 1000);
		assert.strictEqual(output, "Hello, World!\n");
	});

	test("execShellWithTimeout should reject with an error if command execution times out", async () => {
		try {
			await execShellWithTimeout("sleep 5", 1000);
			assert.fail("Expected execShellWithTimeout to throw an error");
		} catch (error: any) {
			assert.strictEqual(error.message, "Command execution timed out");
		}
	});
});
