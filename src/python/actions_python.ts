import * as finder from "setup-python/src/find-python"
import * as finderPyPy from "setup-python/src/find-pypy"
import { existsSync } from "fs"
import { info, warning } from "../utils/io/io"
import * as core from "@actions/core"
import path from "path"
import { isGitHubCI } from "../utils/env/isci"
import { isCacheFeatureAvailable } from "setup-python/src/utils"
import { getCacheDistributor } from "setup-python/src/cache-distributions/cache-factory"

function isPyPyVersion(versionSpec: string) {
  return versionSpec.startsWith("pypy-")
}

async function cacheDependencies(cache: string, pythonVersion: string) {
  const cacheDependencyPath = undefined // core.getInput("cache-dependency-path") || undefined
  const cacheDistributor = getCacheDistributor(cache, pythonVersion, cacheDependencyPath)
  await cacheDistributor.restoreCache()
}

export async function setupActionsPython(version: string, _setupDir: string, arch: string) {
  if (process.env.AGENT_TOOLSDIRECTORY?.trim()) {
    core.debug(`Python is expected to be installed into AGENT_TOOLSDIRECTORY=${process.env.AGENT_TOOLSDIRECTORY}`)
    process.env.RUNNER_TOOL_CACHE = process.env.AGENT_TOOLSDIRECTORY
  } else {
    core.debug(`Python is expected to be installed into RUNNER_TOOL_CACHE==${process.env.RUNNER_TOOL_CACHE}`)
  }
  try {
    if (version) {
      let pythonVersion: string
      if (isPyPyVersion(version)) {
        const installed = await finderPyPy.findPyPyVersion(version, arch)
        pythonVersion = `${installed.resolvedPyPyVersion}-${installed.resolvedPythonVersion}`
        info(
          `Successfully setup PyPy ${installed.resolvedPyPyVersion} with Python (${installed.resolvedPythonVersion})`
        )
      } else {
        const installed = await finder.useCpythonVersion(version, arch)
        pythonVersion = installed.version
        info(`Successfully setup ${installed.impl} (${pythonVersion})`)
      }

      const cache = "pip" // core.getInput("cache") // package manager used for caching
      if (isCacheFeatureAvailable()) {
        await cacheDependencies(cache, pythonVersion)
      }
    }
  } catch (err) {
    core.setFailed((err as Error).message)
  }

  if (isGitHubCI()) {
    addPythonLoggingMatcher()
  }

  return undefined
}

function addPythonLoggingMatcher() {
  const matcherPath = path.join(__dirname, "python_matcher.json")
  if (!existsSync(matcherPath)) {
    return warning("the python_matcher.json file does not exist in the same folder as setup_cpp.js")
  }
  info(`::add-matcher::${matcherPath}`)
}
