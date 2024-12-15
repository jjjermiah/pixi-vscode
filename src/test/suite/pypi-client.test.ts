import * as assert from 'assert';
import * as sinon from 'sinon';
import { Uri, workspace } from 'vscode';
import { PypiService } from '../../pypi/pypi-service';
import { PypiClient, PypiSimple } from '../../pypi/pypi-client';
import { Axios } from "axios";

suite("PypiClient", () => {
	let axiosMock: sinon.SinonStubbedInstance<Axios>;
	let pypiClient: PypiClient;

	const mockPackages: PypiSimple = {
		meta: {
			"_last-serial": 12345,
			"api-version": "1.0",
		},
		projects: [
			{ "_last-serial": 123, name: "package-one" },
			{ "_last-serial": 124, name: "package-two" },
		],
	};

	setup(() => {
		// Mock Axios instance
		axiosMock = sinon.createStubInstance(Axios);
		pypiClient = new PypiClient(axiosMock as unknown as Axios);
	});

	teardown(() => {
		sinon.restore();
	});

	test("getPackages sends correct request to PyPI", async () => {
		// Stub the Axios GET response
		axiosMock.get.resolves({
			data: mockPackages,
			status: 200,
			statusText: "OK",
			headers: {},
			config: {},
		});
	
		const result = await pypiClient.getPackages();

	
		// Verify the result
		assert.deepStrictEqual(result, mockPackages);
	});

	test("getPackages transforms the response correctly", async () => {
		// Stub the Axios GET response with raw data
		axiosMock.get.resolves({
			data: mockPackages, // Use the mockPackages object directly
			status: 200,
			statusText: "OK",
			headers: {},
			config: {
				transformResponse: (data: string) => JSON.parse(data), // Use transformResponse
			},
		});
	
		const result = await pypiClient.getPackages();
	
		// Verify transformation logic
		assert.deepStrictEqual(result, mockPackages); // Compare parsed objects
	});

	test("getPackages throws an error if request fails", async () => {
		// Simulate an Axios request error
		axiosMock.get.rejects(new Error("Network error"));

		try {
			await pypiClient.getPackages();
			assert.fail("Expected getPackages to throw an error");
		} catch (error) {
			assert.strictEqual((error as Error).message, "Network error");
		}
	});
});