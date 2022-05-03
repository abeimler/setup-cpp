import * as execa from "execa"
import { mkdirP } from "@actions/io"
import which from "which"
import { setupSevenZip } from "../../sevenzip/sevenzip"
import { warning } from "../io/io"
export { extractTar, extractXar, extract7z, extractZip } from "@actions/tool-cache"

let sevenZip: string | undefined

export async function extractExe(file: string, dest: string) {
  // install 7z if needed
  if (sevenZip === undefined) {
    if (which.sync("7z", { nothrow: true }) === null) {
      await setupSevenZip("", "", process.arch)
    }
    // eslint-disable-next-line require-atomic-updates
    sevenZip = "7z"
  }

  await execa.execa(sevenZip, ["x", file, `-o${dest}`], { stdio: "inherit" })
  return dest
}

export async function extractTarByExe(file: string, dest: string, flags = ["--strip-components=0"]) {
  try {
    await mkdirP(dest)
  } catch {
    // ignore
  }

  // TODO windows fails to create symlinks
  // https://github.com/heroku/heroku-slugs/issues/3

  try {
    await execa.execa("tar", ["xf", file, "-C", dest, ...flags], { stdio: "inherit" })
  } catch (e) {
    if (process.platform === "win32" && (e as Error).message.includes("Can't create '\\\\?\\C:")) {
      warning(`Failed to extract symlink ${file} to ${dest}. Ignoring this symlink.`)
    }
  }

  return dest
}
