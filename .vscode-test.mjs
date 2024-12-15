import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	// Additional configurations
	coverage: true,
	reporter: 'spec'
});
