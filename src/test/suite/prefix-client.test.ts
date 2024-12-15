import * as assert from "assert";
import { PrefixClient } from "../../prefixAPI/prefix-client";

suite("PrefixClient Tests", function () {
	this.timeout(10000); // Increase timeout to 10 seconds

	test("getAllChannels should return all channels", async () => {
		// Arrange
		const prefixClient = new PrefixClient();

		// Act
		const channels = await prefixClient.getAllChannels();

		// Assert
		assert.strictEqual(Array.isArray(channels), true, "Channels should be an array");
		assert.strictEqual(channels.length > 0, true, "Channels array should not be empty");

		const basicChannels = ["conda-forge", "bioconda"];
		// assert that the basic channels are present
		basicChannels.forEach((channel) => {
			assert.strictEqual(
				channels.some((c) => c.name === channel),
				true,
				`Channel ${channel} should be present`
			);
		});
	});

	test("getPackages should return packages for a given package name", async () => {
		// Arrange
		const prefixClient = new PrefixClient();

		// 10 common packages
		const basicPackages = [
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
		for (const packageName of basicPackages) {
			const packages = await prefixClient.getPackages(packageName);
			// Assert
			assert.strictEqual(Array.isArray(packages), true, `Packages for ${packageName} should be an array`);
			assert.strictEqual(packages.length > 0, true, `Packages array for ${packageName} should not be empty`);

			const matchingPackages = packages.filter((pkg) => pkg.package.includes(packageName));
			assert.strictEqual(
				matchingPackages.length >= packages.length / 10,
				true,
				`At least 10% of packages should include ${packageName}, got ${matchingPackages.length} out of ${packages.length}`
			);
		}
	});
});