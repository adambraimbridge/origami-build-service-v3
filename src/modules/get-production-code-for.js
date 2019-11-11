"use strict";

const execa = require("execa");
const fs = require("fs").promises;

module.exports = getProductionCodeFor;

/**
 * Fetches the tarball for the version from npm.
 *
 * @param {string} name The name of the component.
 * @param {string} version The version of the component whose code you want.
 * @returns {Promise<Buffer>} Buffer which contains a gzipped tarball of the code.
 */
async function getProductionCodeFor(name, version) {
  const { stdout } = await execa.command(`npm pack ${name}@'${version}'`, {
    shell: true,
  });

  const buf = await fs.readFile(stdout);

  return buf;
}