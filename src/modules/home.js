"use strict";

const directoryExists = require("directory-exists");
const fs = require("fs").promises;
const { is } = require("immutable");
const path = require("path");
const process = require("process");
const log = require("./log");

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const compareNumbers = (a, b) => (a > b ? 1 : a < b ? -1 : 0);

/**
 * Lists the contents of `dir`.
 * @param {string} dir
 * @returns {Promise<Array<string>>}
 */
const listDir = async dir => {
  const entries = await fs.readdir(dir, {
    withFileTypes: true,
  });

  return entries
    .filter(entity => {
      if (entity.name.startsWith(".")) {
        return false;
      }

      return true;
    })
    .map(entity => entity.name);
};

/**
 * Returns whether `dir` exists on the file system.
 *
 * This returns `true` for a symlink only if that symlink is unbroken and
 * points to a directory.
 *
 * @param {string} dir
 * @returns {Promise<boolean>}
 */
const dirExists = async dir => {
  return directoryExists(dir);
};

/**
 * Creates a new symlink at path `symlink` that points to `target`.
 *
 * Returns a `Future` which completes to the path to the symlink file.
 *
 * If `relative` is true, creates a symlink with a relative path from the
 * symlink to the target. Otherwise, uses the `target` path unmodified.
 *
 * Note that on Windows, only directories may be symlinked to.
 *
 * @param {string} target
 * @param {string} symlink
 * @param {boolean} [relative]
 */
const createSymlink = async (target, symlink, relative = false) => {
  if (relative) {
    // If the directory where we're creating the symlink was itself reached
    // by traversing a symlink, we want the relative path to be relative to
    // it's actual location, not the one we went through to get to it.
    const symlinkDir = path.join(process.cwd(), path.dirname(symlink));
    target = path.normalize(path.relative(symlinkDir, target));
  }
  log(`Creating ${symlink} pointing to ${target}`);
  await fs.symlink(target, symlink);
};

/**
 * Creates a new symlink that creates an alias at `symlink` that points to the
 * `target`.
 *
 * If `relative` is true, creates a symlink with a relative path from the
 * symlink to the target. Otherwise, uses the `target` path unmodified.
 *
 * @param {string} name
 * @param {string} target
 * @param {string} symlink
 * @param {boolean} [isSelfLink]
 * @param {boolean} [relative]
 */
const createPackageSymlink = async (
  name,
  target,
  symlink,
  isSelfLink = false,
  relative = false,
) => {
  log(
    `Creating ${
      isSelfLink ? "self" : ""
    }link for package '${name}'. From ${symlink}, to ${target}.`,
  );
  await fs.mkdir(path.parse(symlink).dir, { recursive: true });
  await createSymlink(target, symlink, relative);
};

/**
 * Returns whether `version1` is the same as `version2`, ignoring their prereleases.
 * @param {import('./version').Version} version1
 * @param {import('./version').Version} version2
 * @returns {boolean}
 */
const equalsWithoutPreRelease = (version1, version2) =>
  is(version1.major, version2.major) &&
  is(version1.minor, version2.minor) &&
  is(version1.patch, version2.patch);

/**
 * Returns a list containing the sorted elements of `iter`.
 * @param {Array<string>} iter
 * @returns {Array<string>}
 */
function ordered(iter) {
  return iter.sort((a, b) => a.localeCompare(b));
}

/**
 * Returns the first position in `sortedList` that does not compare less than
 * `value`.
 *
 * If the list isn't sorted according to the `compare` function, the result
 * is unpredictable.
 *
 * Returns `sortedList.length` if all the items in `sortedList` compare less
 * than `value`.
 *
 *
 * @template T
 * @param {Array<T>} sortedList
 * @param {T} value
 * @param {(a: T, b: T) => number} compare
 * @returns {number}
 */
function lowerBound(sortedList, value, compare) {
  const index = sortedList.findIndex(element => {
    return compare(element, value) === 0;
  });

  if (index === -1) {
    return sortedList.length;
  } else {
    return index;
  }
}

/**
 * Like `minBy`, but with an asynchronous `orderBy` callback.
 *
 * @template S
 * @param {Array<S>} values
 * @param {(element: S) => Promise<number>} orderBy
 * @returns {Promise<S>}
 */
async function minByAsync(values, orderBy) {
  let minValue;
  let minOrderBy;
  for (const element of values) {
    const elementOrderBy = await orderBy(element);
    if (minOrderBy == null || compareNumbers(elementOrderBy, minOrderBy) < 0) {
      minValue = element;
      minOrderBy = elementOrderBy;
    }
  }
  if (minValue) {
    return minValue;
  } else {
    throw new Error(`minValue is undefined.`);
  }
}

module.exports.compareNumbers = compareNumbers;
module.exports.listDir = listDir;
module.exports.dirExists = dirExists;
module.exports.createPackageSymlink = createPackageSymlink;
module.exports.equalsWithoutPreRelease = equalsWithoutPreRelease;
module.exports.ordered = ordered;
module.exports.lowerBound = lowerBound;
module.exports.minByAsync = minByAsync;
