"use strict";

import { hash, is } from "immutable";
// import { HostedSource } from "./hosted-source";
import { PackageDetail } from "./package-detail";
import { VersionConstraint, VersionRange } from "./version";

/**
 * The base class of `PackageRef`, `PackageId`, and `PackageRange`.
 *
 * @class PackageName
 */
export class PackageName {
  /**
   * Creates an instance of PackageName.
   * @param {string} name
   * @param {import('./source').Source | null} source
   * @param {*} description
   * @memberof PackageName
   */
  constructor(name, source, description) {
    this.name = name;
    this.source = source;
    this.description = description;
  }

  /**
   * Whether this package is the root package.
   *
   * @returns {boolean}
   * @memberof PackageName
   */
  isRoot() {
    return this.source == null;
  }

  /**
   * Returns a `PackageRef` with this one's `name`, `source`, and `description`.
   *
   * @returns {PackageRef}
   * @memberof PackageName
   */
  toRef() {
    return new PackageRef(this.name, this.source, this.description);
  }

  /**
   * Returns a `PackageRange` for this package with the given version constraint.
   *
   * @param {VersionConstraint} constraint
   * @returns {PackageRange}
   * @memberof PackageName
   */
  withConstraint(constraint) {
    return new PackageRange(
      this.name,
      this.source,
      constraint,
      this.description,
    );
  }

  /**
   * Returns whether this refers to the same package as `other`.
   *
   * This doesn't compare any constraint information; it's equivalent to
   * `this.toRef() == other.toRef()`.
   *
   * @param {PackageName} other
   * @returns {boolean}
   * @memberof PackageName
   */
  samePackage(other) {
    if (other.name != this.name) {
      return false;
    }
    if (this.source == null) {
      return other.source == null;
    }

    return (
      other.source == this.source &&
      this.source.descriptionsEqual(this.description, other.description)
    );
  }

  /**
   * @returns {number}
   * @memberof PackageName
   */
  hashCode() {
    if (this.source == null) {
      return hash(this.name);
    }

    return (
      hash(this.name) ^
      hash(this.source) ^
      this.source.hashDescription(this.description)
    );
  }

  /**
   * Returns a string representation of this package name.
   *
   * If `detail` is passed, it controls exactly which details are included.
   *
   * @returns {string}
   * @throws {Error}
   * @memberof PackageName
   */
  toString(/*detail?: PackageDetail*/) {
    throw new Error(
      "Unimplmented method, please implemenet `toString` method on the class which extends PackageName",
    );
  }
}

/**
 * A reference to a specific version of a package.
 *
 * A package ID contains enough information to correctly get the package.
 *
 * It's possible for multiple distinct package IDs to point to different
 * packages that have identical contents. For example, the same package may be
 * available from multiple sources. As far as Pub is concerned, those packages
 * are different.
 *
 * Note that a package ID's `description` field has a different structure than
 * the `PackageRef.description` or `PackageRange.description` fields for some
 * sources. For example, the `git` source adds revision information to the
 * description to ensure that the same ID always points to the same source.
 *
 *
 * @class PackageId
 * @extends {PackageName}
 */
export class PackageId extends PackageName {
  /**
   * Creates an instance of PackageId.
   * Creates an ID for a package with the given `name`, `source`, `version`,
   * and `description`.
   *
   * Since an ID's description is an implementation detail of its source, this
   * should generally not be called outside of `Source` subclasses.
   * @param {string} name
   * @param {import('./source').Source | null} source
   * @param{import('./version').Version} version
   * @param {*} description
   * @memberof PackageId
   */
  constructor(name, source, version, description) {
    super(name, source, description);
    this.version = version;
  }

  /**
   * Creates an ID for the given root package.
   *
   * @static
   * @param {import('./package').Package} $package
   * @returns {PackageId}
   * @memberof PackageId
   */
  static root($package) {
    return new PackageId($package.name, null, $package.version, $package.name);
  }

  /**
   * @returns {number}
   * @memberof PackageId
   */
  hashCode() {
    return super.hashCode() ^ hash(this.version);
  }

  /**
   * @param {*} other
   * @returns {boolean}
   * @memberof PackageId
   */
  equals(other) {
    return (
      other instanceof PackageId &&
      this.samePackage(other) &&
      is(other.version, this.version)
    );
  }

  /**
   * Returns a `PackageRange` that allows only `version` of this package.
   *
   * @returns {PackageRange}
   * @memberof PackageId
   */
  toRange() {
    return this.withConstraint(this.version);
  }

  /**
   * @param {PackageDetail} [detail]
   * @returns {string}
   * @memberof PackageId
   */
  toString(detail) {
    detail = detail ? detail : PackageDetail.defaults;
    let buffer = this.name;
    if (detail.showVersion != null ? detail.showVersion : !this.isRoot()) {
      buffer += ` ${this.version}`;
    }

    // if (
    //   !this.isRoot &&
    //   (detail.showSource != null
    //     ? detail.showSource
    //     : !(this.source instanceof HostedSource))
    // ) {
    //   buffer += ` from ${this.source}`;
    //   if (detail.showDescription) {
    //     buffer += ` ${this.source.formatDescription(this.description)}`;
    //   }
    // }
    return buffer;
  }
}

/**
 * A reference to a constrained range of versions of one package.
 *
 * @class PackageRange
 * @extends {PackageName}
 */
export class PackageRange extends PackageName {
  /**
   * Creates an instance of PackageRange.
   * Creates a reference to package with the given `name`, `source`,
   * `constraint`, and `description`.
   *
   * Since an ID's description is an implementation detail of its source, this
   * should generally not be called outside of `Source` subclasses.
   * @param {string} name
   * @param {import('./source').Source | null} source
   * @param {VersionConstraint} constraint
   * @param {*} description
   * @memberof PackageRange
   */
  constructor(name, source, constraint, description) {
    super(name, source, description);
    this.constraint = constraint;
  }

  /**
   * Creates a range that selects the root package.
   *
   * @static
   * @param {import('./package').Package} $package
   * @returns {PackageRange}
   * @memberof PackageRange
   */
  static root($package) {
    return new PackageRange(
      $package.name,
      null,
      $package.version,
      $package.name,
    );
  }

  /**
   * @param {PackageDetail} [detail]
   * @returns {string}
   * @memberof PackageRange
   */
  toString(detail) {
    detail = detail ? detail : PackageDetail.defaults;
    let buffer = this.name;
    if (
      detail.showVersion != null
        ? detail.showVersion
        : this._showVersionConstraint
    ) {
      buffer += ` ${this.constraint}`;
    }

    // if (
    //   !this.isRoot &&
    //   (detail.showSource != null
    //     ? detail.showSource
    //     : !(this.source instanceof HostedSource))
    // ) {
    //   buffer += ` from ${this.source}`;
    //   if (detail.showDescription) {
    //     buffer += ` ${this.source.formatDescription(this.description)}`;
    //   }
    // }
    return buffer;
  }

  /**
   * Whether to include the version constraint in `toString` by default.
   * @type {boolean}
   * @memberof PackageRange
   */
  get _showVersionConstraint() {
    if (this.isRoot()) {
      return false;
    }
    if (!this.constraint.isAny()) {
      return true;
    }

    return true;
  }

  /**
   * Returns a copy of `this` with the same semantics, but with a `^`-style constraint if possible.
   *
   * @returns {PackageRange}
   * @memberof PackageRange
   */
  withTerseConstraint() {
    if (!(this.constraint instanceof VersionRange)) {
      return this;
    }
    if (this.constraint.toString().startsWith("^")) {
      return this;
    }
    const range = this.constraint;
    if (!range.includeMin) {
      return this;
    }
    if (range.includeMax) {
      return this;
    }
    if (range.min == null) {
      return this;
    }
    if (
      is(range.max, range.min.nextBreaking().firstPreRelease()) ||
      (range.min.isPreRelease() && is(range.max, range.min.nextBreaking()))
    ) {
      return this.withConstraint(VersionConstraint.compatibleWith(range.min));
    } else {
      return this;
    }
  }

  /**
   * Whether `id` satisfies this dependency.
   *
   * Specifically, whether `id` refers to the same package as `this` *and*
   * `constraint` allows `id.version`.
   *
   *
   * @param {PackageId} id
   * @returns {boolean}
   * @memberof PackageRange
   */
  allows(id) {
    return this.samePackage(id) && this.constraint.allows(id.version);
  }

  /**
   * @returns {number}
   * @memberof PackageRange
   */
  hashCode() {
    return super.hashCode() ^ hash(this.constraint);
  }

  /**
   * @param {*} other
   * @returns {boolean}
   * @memberof PackageRange
   */
  equals(other) {
    return (
      other instanceof PackageRange &&
      this.samePackage(other) &&
      is(other.constraint, this.constraint)
    );
  }
}

/**
 * A reference to a `Package`, but not any particular version(s) of it.
 *
 * @class PackageRef
 * @extends {PackageName}
 */
export class PackageRef extends PackageName {
  /**
   * Creates a reference to the given root package.
   *
   * @static
   * @param {import('./package').Package} $package
   * @returns {PackageRef}
   * @memberof PackageRef
   */
  static root($package) {
    return new PackageRef($package.name, null, $package.name);
  }

  /**
   * Creates an instance of PackageRef.
   * Creates a reference to a package with the given `name`, `source`, and
   * `description`.
   *
   * Since an ID's description is an implementation detail of its source, this
   * should generally not be called outside of `Source` subclasses. A reference
   * can be obtained from a user-supplied description using `Source.parseRef`.
   *
   * @param {string} name
   * @param {import('./source').Source | null} source
   * @param {*} description
   * @memberof PackageRef
   */
  constructor(name, source, description) {
    super(name, source, description);
  }

  /**
   * @returns {string}
   * @memberof PackageRef
   */
  toString(/*detail*/) {
    // detail = detail ? detail : PackageDetail.defaults;
    if (this.isRoot()) {
      return this.name;
    }
    const buffer = this.name;

    // if (
    //   detail.showSource != null
    //     ? detail.showSource
    //     : !(this.source instanceof HostedSource)
    // ) {
    //   buffer += ` from ${this.source}`;
    //   if (detail.showDescription) {
    //     buffer += ` ${this.source.formatDescription(this.description)}`;
    //   }
    // }
    return buffer;
  }

  /**
   * @param {*} other
   * @returns {boolean}
   * @memberof PackageRef
   */
  equals(other) {
    return other instanceof PackageRef && this.samePackage(other);
  }
}
