"use strict";

import { Map } from "immutable";
import validateNpmPackageName from "validate-npm-package-name";
import { UserError } from "./modules/errors";

/**
 * Checks whether `str` is an empty string.
 *
 * @param {string} [str=""]
 * @returns {boolean}
 */
function isEmptyString(str = "") {
  return str === "";
}

/**
 * Used to ensure all module names in the modules query parameter conform to the package.json specification.
 * https://docs.npmjs.com/files/package.json#name
 *
 * If all module names are valid, return a Map of module name to version range.
 * If any module names are not valid, return an Error HTTP 400 status code, specifying which module names are invalid.
 *
 * @param {string} modules
 * @throws {import('./modules/errors').UserError}
 * @returns {import("immutable").Map<string, string>}
 */
export const parseModulesParameter = modules => {
  if (!modules) {
    throw new UserError("The modules query parameter is required.");
  }

  if (modules.length === 0) {
    throw new UserError("The modules query parameter can not be empty.");
  }

  const parsedModules = modules.split(",");

  if (parsedModules.some(isEmptyString)) {
    throw new UserError(
      "The modules query parameter can not contain empty module names.",
    );
  }

  const moduleNames = parsedModules.map(mod => {
    if (mod.startsWith("@")) {
      return "@" + mod.split("@")[1];
    } else {
      return mod.split("@")[0];
    }
  });

  const invalidModuleNames = moduleNames.filter(
    name => !isValidNpmModuleName(name),
  );

  if (invalidModuleNames.length > 0) {
    throw new UserError(
      `The modules query parameter contains module names which are not valid: ${invalidModuleNames.join(
        ", ",
      )}.`,
    );
  }

  if (moduleNames.length !== new Set(moduleNames).size) {
    throw new UserError(
      `The modules query parameter contains duplicate module names.`,
    );
  }

  const m = Map(
    parsedModules.map(module => {
      if (!(module.lastIndexOf("@") > 0)) {
        throw new UserError(
          `The bundle request contains ${module} with no version range, a version range is required.\nPlease refer to TODO (build service documentation) for what is a valid version.`,
        );
      }

      return [
        module.substr(0, module.lastIndexOf("@")),
        module.substr(module.lastIndexOf("@") + 1),
      ];
    }),
  );

  return m;
};

/**
 * Checks an npm module name conforms to the package.json specification.
 * @param {String} name An npm module name.
 * @returns {Boolean} Whether the name parameter is valid according to package.json specification.
 */
function isValidNpmModuleName(name) {
  return validateNpmPackageName(name).validForNewPackages;
}
