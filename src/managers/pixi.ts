import { execShellWithTimeout } from "../common/shell";
import { PixiPlatform, PixiProjectType } from "../enums";
import { PixiInfo } from "../types";
import { PixiToolPath } from "../config";

export class Pixi {
	// save the output of the pixi info command
	public pixiInfo!: PixiInfo | undefined;

	constructor(manifestPath?: string) {
		this.getPixiInfo(manifestPath)
			.then((info) => {
				this.pixiInfo = info;
			})
			.catch((error) => {
				console.error(error);
			});
	}

	public async getPixiInfo(
		manifestPath?: string
	): Promise<PixiInfo | undefined> {
		const info = await execShellWithTimeout(
			`${PixiToolPath} info --json ${manifestPath ? `--manifest-path ${manifestPath}` : ""
			}`,
			5000,
		)
			.then((output) => JSON.parse(output) as PixiInfo)
			.catch((error) => {
				console.error(error);
				return undefined;
			});
		return info;
	}
}