/*
MIT License

Copyright (c) 2022-2024 Joshua Tang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { Axios } from "axios";
// import { PypiSimple } from "./types";

// eslint-disable-next-line @typescript-eslint/naming-convention
type PypiLastSerial = { "_last-serial": number };

// eslint-disable-next-line @typescript-eslint/naming-convention
type PypiSimpleMeta = PypiLastSerial & { "api-version": string };

export type PypiProject = PypiLastSerial & { name: string };

export type PypiSimple = { meta: PypiSimpleMeta; projects: PypiProject[] };

export class PypiClient {
	private static baseUrl = "https://pypi.org";

	/* istanbul ignore next */
	static default() {
		return new this(new Axios({ baseURL: PypiClient.baseUrl }));
	}

	private axios: Axios;

	constructor(axios: Axios) {
		this.axios = axios;
	}

	async getPackages() {
		const res = await this.axios.get<PypiSimple>("/simple", {
			headers: { accept: "application/vnd.pypi.simple.v1+json" },
			// Axios doesn't transform the data automatically
			transformResponse: (data) => {
				return JSON.parse(data);
			},
		});
		return res.data;
	}
}
