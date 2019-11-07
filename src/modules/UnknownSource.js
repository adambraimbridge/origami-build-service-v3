"use strict";

const { hash, is } = require("immutable");
const { _BoundUnknownSource } = require("./_BoundUnknownSource");
const { PackageId } = require("./PackageName");
const { PackageRef } = require("./PackageName");
const { Source } = require("./Source");

/**
 * A `Null Object` that represents a source not recognized by pub.
 *
 * It provides some default behavior so that pub can work with sources it
 * doesn't recognize.
 *
 * `null object`: http://en.wikipedia.org/wiki/Null_Object_pattern
 *
 *
 * @class UnknownSource
 * @extends {Source}
 */
class UnknownSource extends Source {
  /**
   * Creates an instance of UnknownSource.
   * @param {string} name
   * @memberof UnknownSource
   */
  constructor(name) {
    super(name);
  }

  /**
   * @param {import('./SystemCache').SystemCache} systemCache
   * @returns {import('./BoundSource').BoundSource}
   * @memberof UnknownSource
   */
  bind(systemCache) {
    return new _BoundUnknownSource(this, systemCache);
  }

  /**
   * Two unknown sources are the same if their names are the same.
   *
   * @param {*} other
   * @returns {boolean}
   * @memberof UnknownSource
   */
  equals(other) {
    return other instanceof UnknownSource && other.name == this.name;
  }

  /**
   * @returns {number}
   * @memberof UnknownSource
   */
  hashCode() {
    return hash(this.name);
  }

  /**
   *
   *
   * @param {string | import('immutable').Map<string, string>} description1
   * @param {string | import('immutable').Map<string, string>} description2
   * @returns {boolean}
   * @memberof UnknownSource
   */
  descriptionsEqual(description1, description2) {
    return is(description1, description2);
  }
  /**
   *
   *
   * @param {string | import('immutable').Map<string, string>} description
   * @returns {number}
   * @memberof UnknownSource
   */
  hashDescription(description) {
    return hash(description);
  }

  /**
   *
   *
   * @param {string} name
   * @param {string | import('immutable').Map<string, string>} description
   * @returns {import('./PackageName').PackageRef}
   * @memberof UnknownSource
   */
  parseRef(name, description) {
    return new PackageRef(name, this, description);
  }

  /**
   *
   *
   * @param {string} name
   * @param {import('./Version').Version} version
   * @param {string | import('immutable').Map<string, string>} description
   * @returns {import('./PackageName').PackageId}
   * @memberof UnknownSource
   */
  parseId(name, version, description) {
    return new PackageId(name, this, version, description);
  }
}
module.exports.UnknownSource = UnknownSource;
