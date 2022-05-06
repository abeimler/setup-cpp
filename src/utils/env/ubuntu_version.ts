import { getUbuntuVersion } from "ubuntu-version"

export async function ubuntuVersion(): Promise<number[] | null> {
  if (process.platform === "linux") {
    const versionSplitted = await getUbuntuVersion()

    if (versionSplitted.length === 0) {
      throw new Error("Failed to get the ubuntu major version.")
    }

    return versionSplitted
  } else {
    return null
  }
}
