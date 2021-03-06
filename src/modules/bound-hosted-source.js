"use strict";

import * as AWS from "aws-sdk";
import * as decompress from "decompress";
import { fromJS, Map } from "immutable";
import * as path from "path";
import { CachedSource } from "./cached-source";
import * as directoryExists from "directory-exists";
import { PackageNotFoundError, ApplicationError } from "./errors";
import { Package } from "./package";
import { Manifest } from "./manifest";
import { ManifestDynamo } from "./manifest-dynamo";
import { mapper } from "./manifest-mapper";
import { debug as log } from "./log";
import { promises as fs } from "fs";

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
 * The `BoundSource` for `HostedSource`.
 *
 * @class BoundHostedSource
 * @extends {CachedSource}
 * @implements {BoundSource}
 */
export class BoundHostedSource extends CachedSource {
  /**
   * Creates an instance of BoundHostedSource.
   * @param {import('./hosted-source').HostedSource} source
   * @param {import('./system-cache').SystemCache} systemCache
   * @memberof BoundHostedSource
   */
  constructor(source, systemCache) {
    super();
    Object.defineProperty(this, "source", {
      value: source,
      writable: true,
    });
    /**
     * @property {import('./hosted-source').HostedSource} source
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
   * @param {import('./package-name').PackageRef} ref
   * @returns {Promise<Array<import('./package-name').PackageId>>}
   * @memberof BoundHostedSource
   */
  async doGetVersions(ref) {
    /**
     * @private
     * @type {import('immutable').Map<import('./package-name').PackageRef, Promise<Array<import('./package-name').PackageId>>>}
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
          const $package = this.source._parseDescription(ref.description);
          log(`Get versions from ${$package}.`);
          const results = [];
          try {
            let count = 0;
            for await (const m of mapper.query(
              ManifestDynamo,
              {
                name: $package,
              },
              {
                projection: ["name", "version", "dependencies"],
              },
            )) {
              count++;
              let manifestMap = Map();
              manifestMap = manifestMap.set("name", m.name);
              manifestMap = manifestMap.set("version", m.version);
              manifestMap = manifestMap.set(
                "dependencies",
                fromJS(JSON.parse(m.dependencies || "{}")),
              );
              const manifest = Manifest.fromMap(
                manifestMap,
                this.systemCache.hostedSource,
                ref.name,
              );
              const id = this.source.idFor(ref.name, manifest.version);
              this.memoizeManifest(id, manifest);
              results.push(id);
            }

            // If no versions are found, make a request for a specific version
            // so that we can get a better error message from DynamoDB
            if (count == 0) {
              await mapper.get(
                Object.assign(new ManifestDynamo(), {
                  name: $package,
                  version: "0",
                }),
                {
                  projection: ["name", "version", "dependencies"],
                },
              );
            }
          } catch (error) {
            const $package = this.source._parseDescription(ref.description);
            this._throwFriendlyError(error, $package);
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
   * @param {import('./package-name').PackageId} id
   * @returns {Promise<import('./manifest').Manifest>}
   * @memberof BoundHostedSource
   */
  async describeUncached(id) {
    const $package = this.source._parseDescription(id.description);
    const version = encodeURIComponent(id.version.toString());
    const manifest = Map();
    try {
      const m = await mapper.get(
        Object.assign(new ManifestDynamo(), { name: $package, version }),
        { projection: ["name", "version", "dependencies"] },
      );
      manifest.set("name", m.name);
      manifest.set("version", m.version);
      manifest.set("dependencies", fromJS(JSON.parse(m.dependencies || "{}")));
    } catch (error) {
      this._throwFriendlyError(error, $package);
    }

    return Manifest.fromMap(manifest, this.systemCache.hostedSource, id.name);
  }

  /**
   * Downloads the package identified by `id` to the system cache.
   *
   * @param {import('./package-name').PackageId} id
   * @returns {Promise<Package>}
   * @memberof BoundHostedSource
   */
  async downloadToSystemCache(id) {
    if (!(await this.isInSystemCache(id))) {
      const packageDir = this.getDirectory(id);
      await fs.mkdir(path.dirname(packageDir), { recursive: true });
      const $package = this.source._parseDescription(id.description);
      await this._download($package, id.version, packageDir);
    }

    return Package.load(this.getDirectory(id), this.systemCache.hostedSource);
  }

  /**
   * The system cache directory for the hosted source contains subdirectories
   * for each separate repository URL that's used on the system.
   *
   * Each of these subdirectories then contains a subdirectory for each
   * package downloaded from that site.
   *
   * @param {import('./package-name').PackageId} id
   * @returns {string}
   * @memberof BoundHostedSource
   */
  getDirectory(id) {
    const $package = this.source._parseDescription(id.description);

    return path.join(this.systemCacheRoot, `${$package}-${id.version}`);
  }

  /**
   * Gets all of the packages that have been downloaded into the system cache.
   *
   * @returns {Promise<Array<Package>>}
   * @memberof BoundHostedSource
   */
  async getCachedPackages() {
    const cacheDir = path.join(this.systemCacheRoot);
    if (!(await directoryExists(cacheDir))) {
      return [];
    }
    const entries = await listDir(cacheDir);

    return entries.map(entry => {
      return Package.load(entry, this.systemCache.hostedSource);
    });
  }

  /**
   * Downloads package `package` at `version` from `server`, and unpacks it into `destPath`.
   *
   * @param {string} $package
   * @param {import('./version').Version} version
   * @param {string} destPath
   * @returns {Promise<void>}
   * @memberof BoundHostedSource
   */
  async _download($package, version, destPath) {
    log(`Downloading ${$package} ${version}...`);
    // Download and extract the archive to a temp directory.
    const tempDir = await this.systemCache.createTempDir();
    const response = await mapper.get(
      Object.assign(new ManifestDynamo(), { name: $package, version }),
    );
    const a = await this.systemCache.createTempDir();
    const tarPath = path.join(a, `${$package}@${version}.tar.gz`);
    await fs.mkdir(path.dirname(tarPath), { recursive: true });
    const useLocal = process.env.STAGE === "local";
    const localhost = process.env.LOCALSTACK_HOSTNAME || "localhost";
    let s3;
    if (useLocal) {
      s3 = new AWS.S3({
        /**
         * Including this option gets localstack to more closely match the defaults for
         * live S3. If you omit this, you will need to add the bucketName to the start
         * of the `Key` property.
         */
        endpoint: `http://${localhost}:4572`,
        s3ForcePathStyle: true,
      });
    } else {
      s3 = new AWS.S3();
    }

    if (!process.env.MODULE_BUCKET_NAME) {
      throw new Error(
        "Environment variable $MODULE_BUCKET_NAME does not exist.",
      );
    }

    const params = {
      Bucket: process.env.MODULE_BUCKET_NAME,
      Key: response.codeLocation,
    };

    try {
      const { Body: code } = await s3.getObject(params).promise();
      await fs.writeFile(tarPath, code);
    } catch (err) {
      this._throwFriendlyError(err, response.codeLocation);
    }
    try {
      await decompress(tarPath, tempDir, {
        strip: 1,
      });
      // Now that the get has succeeded, move it to the real location in the
      // cache. This ensures that we don't leave half-busted ghost
      // directories in the user's pub cache if a get fails.
      await fs.rename(tempDir, destPath);
    } catch (err) {
      this._throwFriendlyError(err, $package);
    }
  }

  /**
   * When an error occurs trying to read something about `package` from `url`,
   * this tries to translate into a more user friendly error message.
   *
   * Always throws an error, either the original one or a better one.
   *
   * @param {Error} error
   * @param {string} $package
   * @memberof BoundHostedSource
   */
  _throwFriendlyError(error, $package) {
    if (error.name === "ItemNotFoundException") {
      throw new PackageNotFoundError(`could not find package ${$package}`);
    } else if (error.name === "InvalidAccessKeyId") {
      throw new ApplicationError(
        `could not download package ${$package} from S3`,
      );
    } else {
      // Otherwise re-throw the original error.
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
}
