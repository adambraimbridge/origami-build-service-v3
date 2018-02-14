"use strict";

const fs = require("fs-extra");
const createTemporaryDirectory = require("./create-temp-folder");
const createBundleFilename = require("./generate-safe-bundle-filename");
const installModules = require("./install-modules");
const createEntryFile = require("./create-entry-file-js");
const createBundleFile = require("./create-bundle-file-js");
// const deleteDirectory = require("./delete-directory");

module.exports = async ({ modules, namespace, minify, autoinit }) => {
	// createFilename
	const filename = await createBundleFilename({
		modules,
		namespace,
		minify,
		autoinit,
	});
	// createTemporaryDirectory
	const installationDirectory = await createTemporaryDirectory(filename);
	// installModules
	await installModules({
		installationDirectory,
		modules,
		autoinit,
	});
	// createEntryFile
	const entryFile = await createEntryFile({
		installationDirectory,
		modules,
		namespace,
		autoinit,
	});
	// createBundleFile
	const bundleFile = await createBundleFile({
		installationDirectory,
		entryFile,
		minify,
	});
	const bundleFileContents = await fs.readFile(bundleFile, "utf8");
	// deleteDirectory
	// await deleteDirectory(installationDirectory);
	return bundleFileContents;
};