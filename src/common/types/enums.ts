export enum PixiPlatform {
	noarch = "noarch",
	unknown = "unknown",
	linux32 = "linux-32",
	linux64 = "linux-64",
	linuxaarch64 = "linux-aarch64",
	linuxarmv6l = "linux-armv6l",
	linuxarmv7l = "linux-armv7l",
	linuxppc64le = "linux-ppc64le",
	linuxppc64 = "linux-ppc64",
	linuxs390x = "linux-s390x",
	linuxriscv32 = "linux-riscv32",
	linuxriscv64 = "linux-riscv64",
	osx64 = "osx-64",
	osxarm64 = "osx-arm64",
	win32 = "win-32",
	win64 = "win-64",
	winarm64 = "win-arm64",
	emscriptenwasm32 = "emscripten-wasm32",
	wasiwasm32 = "wasi-wasm32",
}

export enum PixiProjectType {
	Pixi = "pixi",
	Pyproject = "pyproject",
}

export enum PixiCommand {
	// Maybe find a way to locate the pixi binary or implement for a future option of asking user to locate it
	tool = "pixi",

	// Pixi commands
	init = "init",
	install = "install",
	add = "add",
	remove = "remove",
	list = "list",

	addChannel = "project channel add",
}