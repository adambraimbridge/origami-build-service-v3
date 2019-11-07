"use strict";

const AWS = require("aws-sdk");
const { ItemNotFoundException } = require("@aws/dynamodb-data-mapper");
const decompress = require("decompress");
const { writeFile, rename, mkdir } = require("fs").promises;
const { fromJS, Map } = require("immutable");
const path = require("path");
const { CachedSource } = require("./CachedSource");
const { dirExists, listDir, PackageNotFoundException, URL } = require("./HOME");
const { Package } = require("./Package");
const { Manifest } = require("./Manifest");
const { ManifestDynamo } = require("./ManifestDynamo");
const { mapper } = require("./ManifestMapper");

/**
 * The `BoundSource` for `HostedSource`.
 *
 * @class BoundHostedSource
 * @extends {CachedSource}
 * @implements {BoundSource}
 */
class BoundHostedSource extends CachedSource {
  /**
   * Creates an instance of BoundHostedSource.
   * @param {import('./HostedSource').HostedSource} source
   * @param {import('./SystemCache').SystemCache} systemCache
   * @memberof BoundHostedSource
   */
  constructor(source, systemCache) {
    super();
    Object.defineProperty(this, "source", {
      value: source,
      writable: true,
    });
    /**
     * @property {import('./HostedSource').HostedSource} source
     * @instance
     * @memberof BoundHostedSource
     */
    this.source = source;
    Object.defineProperty(this, "systemCache", {
      value: systemCache,
      writable: true,
    });
  }

  /**
   * Downloads a list of all versions of a package that are available from the site.
   *
   * @param {import('./PackageName').PackageRef} ref
   * @returns {Promise<Array<import('./PackageName').PackageId>>}
   * @memberof BoundHostedSource
   */
  async doGetVersions(ref) {
    /**
     * @private
     * @type {import('immutable').Map<import('./PackageName').PackageRef, Promise<Array<import('./PackageName').PackageId>>>}
     */
    this.doGetVersionsMemo = this.doGetVersionsMemo
      ? this.doGetVersionsMemo
      : Map();
    if (this.doGetVersionsMemo.has(ref)) {
      // @ts-ignore Type 'PackageId[] | undefined' is not assignable to type 'PackageId[]'.
      return this.doGetVersionsMemo.get(ref);
    } else {
      this.doGetVersionsMemo = this.doGetVersionsMemo.set(
        ref,
        (async () => {
          const parsed = this.source._parseDescription(ref.description);
          const pkg = parsed.first;
          console.log(`Get versions from ${pkg}.`);
          const results = [];
          try {
            for await (const m of mapper.query(
              ManifestDynamo,
              {
                name: pkg,
              },
              {
                projection: ["name", "version", "dependencies"],
              },
            )) {
              let manifestMap = Map();
              manifestMap = manifestMap.set("name", m.name);
              manifestMap = manifestMap.set("version", m.version);
              manifestMap = manifestMap.set(
                "dependencies",
                fromJS(JSON.parse(m.dependencies || "{}")),
              );
              const manifest = Manifest.fromMap(
                manifestMap,
                this.systemCache.sources,
                ref.name,
              );
              const id = this.source.idFor(ref.name, manifest.version);
              this.memoizeManifest(id, manifest);
              results.push(id);
            }
          } catch (error) {
            const parsed = this.source._parseDescription(ref.description);
            this._throwFriendlyError(error, parsed.first, parsed.last);
          }

          return results;
        })(),
      );

      // @ts-ignore Type 'PackageId[] | undefined' is not assignable to type 'PackageId[]'.
      return this.doGetVersionsMemo.get(ref);
    }
  }

  /**
   * Downloads and parses the manifest for a specific version of a package that is available from the site.
   *
   * @param {import('./PackageName').PackageId} id
   * @returns {Promise<import('./Manifest').Manifest>}
   * @memberof BoundHostedSource
   */
  async describeUncached(id) {
    const parsed = this.source._parseDescription(id.description);
    const pkg = parsed.first;
    const version = encodeURIComponent(id.version.toString());
    const manifest = Map();
    try {
      const m = await mapper.get(
        Object.assign(new ManifestDynamo(), { name: pkg, version }),
        { projection: ["name", "version", "dependencies"] },
      );
      manifest.set("name", m.name);
      manifest.set("version", m.version);
      manifest.set("dependencies", fromJS(JSON.parse(m.dependencies || "{}")));
    } catch (error) {
      this._throwFriendlyError(error);
    }

    return Manifest.fromMap(manifest, this.systemCache.sources, id.name);
  }

  /**
   * Downloads the package identified by `id` to the system cache.
   *
   * @param {import('./PackageName').PackageId} id
   * @returns {Promise<Package>}
   * @memberof BoundHostedSource
   */
  async downloadToSystemCache(id) {
    if (!(await this.isInSystemCache(id))) {
      const packageDir = this.getDirectory(id);
      await mkdir(path.dirname(packageDir), { recursive: true });
      const parsed = this.source._parseDescription(id.description);
      await this._download(parsed.first, id.version, packageDir);
    }

    return Package.load(this.getDirectory(id), this.systemCache.sources);
  }

  /**
   * The system cache directory for the hosted source contains subdirectories
   * for each separate repository URL that's used on the system.
   *
   * Each of these subdirectories then contains a subdirectory for each
   * package downloaded from that site.
   *
   * @param {import('./PackageName').PackageId} id
   * @returns {string}
   * @memberof BoundHostedSource
   */
  getDirectory(id) {
    const parsed = this.source._parseDescription(id.description);
    const dir = this._urlToDirectory(parsed.last);

    return path.join(
      this.systemCacheRoot,
      dir,
      `${parsed.first}-${id.version}`,
    );
  }

  /**
   * Gets all of the packages that have been downloaded into the system cache from the default server.
   *
   * @returns {Promise<Array<Package>>}
   * @memberof BoundHostedSource
   */
  async getCachedPackages() {
    const cacheDir = path.join(
      this.systemCacheRoot,
      this._urlToDirectory(this.source.defaultUrl),
    );
    if (!(await dirExists(cacheDir))) {
      return [];
    }
    const entries = await listDir(cacheDir);

    return entries.map(entry => {
      return Package.load(entry, this.systemCache.sources);
    });
  }

  /**
   * Downloads package `package` at `version` from `server`, and unpacks it into `destPath`.
   *
   * @param {string} $package
   * @param {import('./Version').Version} version
   * @param {string} destPath
   * @returns {Promise<void>}
   * @memberof BoundHostedSource
   */
  async _download($package, version, destPath) {
    console.log(`Downloading ${$package} ${version}...`);
    // Download and extract the archive to a temp directory.
    const tempDir = await this.systemCache.createTempDir();
    const response = await mapper.get(
      Object.assign(new ManifestDynamo(), { name: $package, version }),
    );
    const a = await this.systemCache.createTempDir();
    const tarPath = path.join(a, `${$package}@${version}.tar.gz`);
    await mkdir(path.dirname(tarPath), { recursive: true });
    const s3 = new AWS.S3();
    if (!process.env.MODULE_BUCKET_NAME) {
      throw new Error(
        "Environment variable $MODULE_BUCKET_NAME does not exist.",
      );
    }
    const params = {
      Bucket: process.env.MODULE_BUCKET_NAME,
      Key: response.codeLocation,
    };

    const { Body: code } = await s3.getObject(params).promise();
    await writeFile(tarPath, code);
    await decompress(tarPath, tempDir, {
      strip: 1,
    });
    // Now that the get has succeeded, move it to the real location in the
    // cache. This ensures that we don't leave half-busted ghost
    // directories in the user's pub cache if a get fails.
    await rename(tempDir, destPath);
  }

  /**
   * When an error occurs trying to read something about `package` from `url`,
   * this tries to translate into a more user friendly error message.
   *
   * Always throws an error, either the original one or a better one.
   *
   * @param {Error} error
   * @param {string} [$package]
   * @param {string} [url]
   * @memberof BoundHostedSource
   */
  _throwFriendlyError(error, $package, url) {
    if (error instanceof ItemNotFoundException) {
      throw new PackageNotFoundException(
        `could not find package ${$package} at ${url}`,
      );
    } else {
      // Otherwise re-throw the original exception.
      throw error;
    }
  }

  /**
   * Given a URL, returns a "normalized" string to be used as a directory name for packages downloaded from the server at that URL.
   *
   * @param {string} url
   * @returns {string}
   * @memberof BoundHostedSource
   */
  _urlToDirectory(url) {
    function replacer(substring) {
      return `%${Array.from(substring, character =>
        character.codePointAt(0),
      ).join("")}`;
    }

    return url.replace(/[<>:"\\/|?*%]/g, replacer);
  }

  /**
   * Parses `id` into its server, package name, and version components, then
   * converts that to a Uri given `pattern`.
   *
   * Ensures the package name is properly URL encoded.
   *
   * @param {import('./PackageName').PackageId} id
   * @param {(server: string, $package: string, version: string) => string} pattern
   * @returns {import('url').URL}
   * @memberof BoundHostedSource
   */
  _makeVersionUrl(id, pattern) {
    const parsed = this.source._parseDescription(id.description);
    const server = parsed.last;
    const $package = parsed.first;
    const version = encodeURIComponent(id.version.toString());

    return new URL(pattern(server, $package, version));
  }
}

module.exports.BoundHostedSource = BoundHostedSource;
