"use strict";

const path = require("path");
const execa = require("execa");

module.exports = async ({ installationDirectory, entryFile, minify }) => {
	const buildFlags = [
		`--sass=${entryFile}`,
		`--build-folder=${path.join(installationDirectory, "build")}`,
		"--build-css=main.css",
		`--cwd=${installationDirectory}`,
	];

	if (minify === undefined || minify === "on") {
		buildFlags.push("--production");
	}
	await execa.stdout("origami-build-tools", ["build", ...buildFlags]);

	return `${installationDirectory}/build/main.css`;
};