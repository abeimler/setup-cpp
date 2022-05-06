import { isValidUrl } from "../http/validate_url"
import semverCompare from "semver/functions/compare"
import semverCoerce from "semver/functions/coerce"
import semverValid from "semver/functions/valid"
import { getExecOutput } from "@actions/exec"
import { info } from "../io/io"

/**
 * Gets the specific versions supported by this action compatible with the supplied (specific or minimum) version in
 * descending order of release (e.g., `5.0.2`, `5.0.1`, and `5.0.0` for `5`).
 */
export function getSpecificVersions(versions: Set<string>, semversion: string): string[] {
  return Array.from(versions)
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v) && v.startsWith(semversion))
    .sort()
    .reverse()
}

/**
 * Gets the specific and minimum versions that can be used to refer to the supplied specific versions (e.g., `3`, `3.5`,
 * `3.5.2` for `3.5.2`).
 */
export function getVersions(specific: string[]): Set<string> {
  const versions = new Set(specific)

  for (const version of specific) {
    versions.add(/^\d+/.exec(version)![0])
    versions.add(/^\d+\.\d+/.exec(version)![0])
  }

  return versions
}

/** Gets the most recent specific version for which there is a valid download URL. */
export async function getSpecificVersionAndUrl(
  versions: Set<string>,
  platform: string,
  version: string,
  getUrl: (platform: string, version: string) => string | null | Promise<string | null>
): Promise<[string, string]> {
  // specific ubuntu version
  if (platform === "linux" && version.includes("ubuntu")) {
    const url = await getUrl(platform, version)
    // eslint-disable-next-line no-await-in-loop
    if (url !== null && (await isValidUrl(url))) {
      return [version, url]
    }
  }

  if (!versions.has(version)) {
    throw new Error(`Unsupported target! (platform='${platform}', version='${version}')`)
  }

  for (const specificVersion of getSpecificVersions(versions, version)) {
    // eslint-disable-next-line no-await-in-loop
    const url = await getUrl(platform, specificVersion)
    // eslint-disable-next-line no-await-in-loop
    if (url !== null && (await isValidUrl(url))) {
      return [specificVersion, url]
    }
  }

  throw new Error(`Unsupported target! (platform='${platform}', version='${version}')`)
}

export const defaultVersionRegex = /v?(\d\S*)/

/** Get the version of a binary */
export async function getBinVersion(file: string, versionRegex: RegExp = defaultVersionRegex) {
  try {
    const execout = await getExecOutput(file, ["--version"])
    const version_output = execout.stdout || execout.stderr || ""
    const version = version_output.trim().match(versionRegex)?.[1]
    return version
  } catch (e) {
    console.error(e)
    return undefined
  }
}

/** Check if the given bin is up to date against the target version */
export async function isBinUptoDate(
  givenFile: string,
  targetVersion: string,
  versionRegex: RegExp = defaultVersionRegex
) {
  const givenVersion = await getBinVersion(givenFile, versionRegex)
  if (
    typeof givenVersion === "string" &&
    typeof targetVersion === "string" &&
    givenVersion !== "" &&
    targetVersion !== ""
  ) {
    return semverCompare(givenVersion, targetVersion) !== -1
  } else {
    // assume given version is old
    return false
  }
}

/** Coerce the given version if it is invalid */
export function semverCoerceIfInvalid(version: string) {
  if (semverValid(version) === null) {
    // version coercion
    try {
      // find the semver version of an integer
      const coercedVersion = semverCoerce(version)
      if (coercedVersion !== null) {
        info(`Coerced version '${version}' to '${coercedVersion}'`)
        return coercedVersion.version
      }
    } catch (err) {
      // handled below
    }
  }
  return version
}
