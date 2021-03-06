"use strict";

import * as fs from "fs";
import { fromJS, Map } from "immutable";
import * as path from "path";
import { FileError, ManifestError } from "./errors";
import { Version, VersionConstraint, VersionRange } from "./version";
import * as fromEntries from "object.fromentries";
import * as type from "type-detect";

/**
 * The parsed contents of a manifest file.
 *
 * The fields of a manifest are, for the most part, validated when they're first
 * accessed. This allows a partially-invalid manifest to be used if only the
 * valid portions are relevant. To get a list of all errors in the manifest, use
 * `allErrors`.
 *
 * @class Manifest
 */
export class Manifest {
  /**
   * Creates an instance of Manifest.
   * @param {string} _name
   * @param {import('./version').Version=} version
   * @param {Array<import('./package-name').PackageRange>=} dependencies
   * @param {import('immutable').Map<any, any>=} fields
   * @param {import('./hosted-source').HostedSource=} source
   * @memberof Manifest
   */
  constructor(_name, version, dependencies, fields, source) {
    this._version = version;
    /**
     * @type {Object.<string, import('./package-name').PackageRange>}
     */
    this._dependencies =
      dependencies == null
        ? null
        : fromEntries(dependencies.map(range => [range.name, range]));
    this.fields = fields == null ? Map() : Map(fields);
    this._source = source;
    this._name = _name;
  }

  /**
   * Loads the manifest for a package located in `packageDir`.
   *
   *
   * @static
   * @param {string} packageDir
   * @param {import('./hosted-source').HostedSource} source
   * @returns {Manifest}
   * @memberof Manifest
   */
  static load(packageDir, source) {
    const manifestPath = path.join(packageDir, "package.json");
    if (!fs.existsSync(manifestPath)) {
      throw new FileError(
        `Could not find a file named "package.json" in "${packageDir}".`,
      );
    }

    return Manifest.parse(fs.readFileSync(manifestPath, "utf-8"), source);
  }

  /**
   * Returns a Manifest object for an already-parsed map representing its
   * contents.
   *
   * If `expectedName` is passed and the manifest doesn't have a matching name
   * field, this will throw a `ManifestError`.
   *
   * `location` is the location from which this manifest was loaded.
   *
   * @static
   * @param {import('immutable').Map<any, any>} fields
   * @param {import('./hosted-source').HostedSource} _source
   * @param {string=} expectedName
   * @throws {import('./errors').ManifestError}
   * @returns {Manifest}
   * @memberof Manifest
   */
  static fromMap(fields, _source, expectedName) {
    // If `expectedName` is passed, ensure that the actual 'name' field exists
    // and matches the expectation.
    if (expectedName == null || fields.get("name") == expectedName) {
      return new Manifest(
        fields.get("name"),
        undefined,
        undefined,
        fields,
        _source,
      );
    }
    throw new ManifestError(
      `"name" field doesn't match expected name "${expectedName}".`,
    );
  }

  /**
   * Parses the manifest stored at `filePath` whose text is `contents`.
   *
   * If the manifest doesn't define a version for itself, it defaults to
   * `Version.none`.
   *
   * @static
   * @param {string} contents
   * @param {import('./hosted-source').HostedSource} source
   * @param {string=} expectedName
   * @returns {Manifest}
   * @throws {import('./errors').ManifestError}
   * @memberof Manifest
   */
  static parse(contents, source, expectedName) {
    let manifestNode;
    try {
      manifestNode = fromJS(JSON.parse(contents));
    } catch {
      throw new ManifestError(
        `The manifest must be a JSON object. The manifest is "${contents}".`,
      );
    }
    let manifestMap;
    if (manifestNode instanceof Map) {
      manifestMap = Map(manifestNode);
    } else {
      throw new ManifestError(
        `The manifest must be a JSON object but it was a ${type(
          manifestNode,
        )}. The manifest is "${contents}".`,
      );
    }

    return Manifest.fromMap(manifestMap, source, expectedName);
  }

  /**
   * The package's name.
   *
   * @returns {string}
   * @throws {import('./errors').ManifestError}
   * @readonly
   * @memberof Manifest
   */
  get name() {
    if (this._name != null) {
      return this._name;
    }
    const name = this.fields.get("name");
    if (name == null) {
      throw new ManifestError(
        `The manifest is missing the "name" field, which should be a string. The manifest is "${JSON.stringify(
          this.fields,
        )}".`,
      );
    } else if (typeof name != "string") {
      throw new ManifestError(
        `The manifest's "name" field, must be a string but it was a ${type(
          name,
        )}. The manifest is "${JSON.stringify(this.fields, undefined, 4)}".`,
      );
    }
    this._name = name;

    return this._name;
  }

  /**
   * The package's version.
   *
   * @returns {import('./version').Version}
   * @readonly
   * @memberof Manifest
   */
  get version() {
    if (this._version != null) {
      return this._version;
    }
    const version = this.fields.get("version");
    if (version == null) {
      this._version = Version.none;

      return this._version;
    }
    if (typeof version == "number") {
      let fixed = `${version}.0`;
      if (Math.trunc(version) === version) {
        fixed = `${fixed}.0`;
      }
      this._error(
        `"version" field must have three numeric components: major, minor, and patch. Instead of "${version}", it needs to be "${fixed}".`,
      );
    }
    if (typeof version != "string") {
      this._error(
        `The manifest's "version" field, must be a string but it was a ${type(
          version,
        )}. The manifest is "${JSON.stringify(this.fields, undefined, 4)}".`,
      );
    }
    this._version = Version.parse(version);

    return this._version;
  }

  /**
   * The additional packages this package depends on.
   *
   * @returns {Object.<string, import('./package-name').PackageRange>}
   * @readonly
   * @memberof Manifest
   */
  get dependencies() {
    if (this._dependencies != null) {
      return this._dependencies;
    }
    this._dependencies = this._parseDependencies(
      "dependencies",
      this.fields.get("dependencies"),
    );

    return this._dependencies;
  }

  /**
   * Parses the dependency field named `field`, and returns the corresponding
   * map of dependency names to dependencies.
   *
   * @param {string} field
   * @param {import('immutable').Map<string, string>} node
   * @returns {Object.<string, import('./package-name').PackageRange>}
   * @memberof Manifest
   */
  _parseDependencies(field, node) {
    /**
     * @type {Object.<string, import('./package-name').PackageRange>}
     */
    const dependencies = {};
    // Allow an empty dependencies key.
    if (node == null) {
      return dependencies;
    }
    if (!(node instanceof Map)) {
      this._error(
        `The manifest's "${field}" field, must be a JSON Object but it was a ${type(
          node,
        )}. The manifest is "${JSON.stringify(this.fields, undefined, 4)}".`,
      );
    }

    const nonStringNode = node.findKey((_, key) => typeof key != "string");
    if (nonStringNode != null) {
      this._error("A dependency name must be a string.");
    }
    node.forEach((spec, name) => {
      if (this.fields.get("name") != null && name == this.name) {
        this._error(
          `The manifest's "${field}" field has an entry for itself. A manifest may not directly depend on itself. The manifest is "${JSON.stringify(
            this.fields,
            undefined,
            4,
          )}".`,
        );
      }
      if (typeof spec == "string") {
        if (spec.length > 0 && this._source) {
          try {
            const versionConstraint = this._parseVersionConstraint(spec);
            // Let the source validate the description.
            const ref = this._source.parseRef(name, name);
            dependencies[name] = ref.withConstraint(versionConstraint);
          } catch (e) {
            this._error(
              `The manifest's "${field}" field has an entry for "${name}" which is an invalid SemVer string. The manifest is "${JSON.stringify(
                this.fields,
                undefined,
                4,
              )}". ${e.message}`,
            );
          }
        } else {
          this._error(
            `The manifest's "${field}" field has an entry for "${name}" which is an empty string. Dependencies can only be defined with SemVer strings. The manifest is "${JSON.stringify(
              this.fields,
              undefined,
              4,
            )}".`,
          );
        }
      } else {
        this._error(
          `The manifest's "${field}" field has an entry for "${name}" which is not a string. Dependencies can only be defined with SemVer strings. The manifest is "${JSON.stringify(
            this.fields,
            undefined,
            4,
          )}".`,
        );
      }
    });

    return dependencies;
  }

  /**
   * Parses `node` to a `VersionConstraint`.
   *
   * If or `defaultUpperBoundConstraint` is specified then it will be set as
   * the max constraint if the original constraint doesn't have an upper
   * bound and it is compatible with `defaultUpperBoundConstraint`.
   *
   * @param {string} version
   * @param {import('./version').VersionConstraint=} defaultUpperBoundConstraint
   * @returns {import('./version').VersionConstraint}
   * @memberof Manifest
   */
  _parseVersionConstraint(version, defaultUpperBoundConstraint) {
    if (version == null) {
      return defaultUpperBoundConstraint != null
        ? defaultUpperBoundConstraint
        : VersionConstraint.any;
    }
    if (typeof version != "string") {
      this._error("A version constraint must be a string.");
    }
    if (version.includes("git.svc.ft.com:9080/git/origami/")) {
      version = version.replace(
        /https?:\/\/git\.svc\.ft\.com:9080\/git\/origami\/.*\.git#/,
        "",
      );
    }
    if (version.includes("github.com/Financial-Times/")) {
      version = version.replace(
        /https?:\/\/github\.com\/Financial-Times\/.*\.git#/,
        "",
      );
    }
    let constraint = VersionConstraint.parse(version);
    if (
      defaultUpperBoundConstraint != null &&
      constraint instanceof VersionRange &&
      constraint.max == null &&
      defaultUpperBoundConstraint.allowsAny(constraint)
    ) {
      constraint = VersionConstraint.intersection([
        constraint,
        defaultUpperBoundConstraint,
      ]);
    }

    return constraint;
  }

  /**
   * Throws a `ManifestError` with the given message.
   * @throws {import('./errors').ManifestError}
   * @param {string} message
   * @memberof Manifest
   */
  _error(message) {
    throw new ManifestError(`${this.name}@${this.version}: ${message}`);
  }
}
