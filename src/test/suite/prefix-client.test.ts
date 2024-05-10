import * as assert from "assert";
import { PrefixClient } from "../../prefixAPI/prefix-client";

suite("PrefixClient Tests", () => {
	test("getAllChannels should return all channels", async () => {
		// Arrange
		const prefixClient = new PrefixClient();

		// Act
		const channels = await prefixClient.getAllChannels();

		// Assert
		assert.strictEqual(Array.isArray(channels), true);
		assert.strictEqual(channels.length > 0, true);

		const basicChannels = ["conda-forge", "bioconda"];
		// assert that the basic channels are present
		basicChannels.forEach((channel) => {
			assert.strictEqual(
				channels.some((c) => c.name === channel),
				true
			);
		});
	});

	test("getPackages should return packages for a given package name", async () => {
		// Arrange
		const prefixClient = new PrefixClient();

		// 10 common packages
		const basicPackages = [
			"numpy",
			"pandas",
			"matplotlib",
			"scipy",
			"seaborn",
			"jupyter",
			"ipython",
			"ipykernel",
			"ipywidgets",
			"jupyterlab",
		];

		// Act
		basicPackages.map(async (packageName) => {
			const packages = await prefixClient.getPackages(packageName);
			// Assert
			assert.strictEqual(Array.isArray(packages), true);
			assert.strictEqual(packages.length > 0, true);

			packages.forEach((pkg) => {
				assert.strictEqual(pkg.package.includes(packageName), true);
			});
		});
	});
});
