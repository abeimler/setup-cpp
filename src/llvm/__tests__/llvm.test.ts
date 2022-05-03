import { setupLLVM, VERSIONS, getUrl, setupClangTools } from "../llvm"
import { getSpecificVersionAndUrl } from "../../utils/setup/version"
import { isValidUrl } from "../../utils/http/validate_url"
import { setupTmpDir, cleanupTmpDir, testBin } from "../../utils/tests/test-helpers"
import { isGitHubCI } from "../../utils/env/isci"
import * as execa from "execa"
import path from "path"
import { addBinExtension } from "../../utils/extension/extension"
import { chmodSync } from "fs"
import { getVersion } from "../../default_versions"

jest.setTimeout(400000)
async function testUrl(version: string) {
  const [specificVersion, url] = await getSpecificVersionAndUrl(VERSIONS, process.platform, version, getUrl)

  if (!(await isValidUrl(url))) {
    throw new Error(`Failed to install Version: ${version} => ${specificVersion} \n URL: ${url}`)
  }
}

describe("setup-llvm", () => {
  let directory: string
  beforeAll(async () => {
    directory = await setupTmpDir("llvm")
  })

  it("Finds valid LLVM URLs", async () => {
    await Promise.all(
      [
        // "14.0.1",
        "14.0.0",
        "13.0.0",
        "12.0.0",
        "12",
        "11",
        "11.0.0",
        "10",
        "10.0.0",
        "9.0.0",
        "8",
        "8.0.0",
        "7.0.0",
        "7",
        "6",
        "6.0.0",
        "5",
        "5.0.0",
        "4",
      ].map((version) => testUrl(version))
    )
  })

  it("should setup LLVM", async () => {
    const { binDir } = await setupLLVM(getVersion("llvm", "true"), directory, process.arch)
    await testBin("clang++", ["--version"], binDir)

    expect(process.env.CC?.includes("clang")).toBeTruthy()
    expect(process.env.CXX?.includes("clang++")).toBeTruthy()

    // test compilation
    const file = path.join(__dirname, "main.cpp")
    const main_exe = path.join(__dirname, addBinExtension("main"))
    execa.execaSync("clang++", [file, "-o", main_exe], { cwd: __dirname })
    if (process.platform !== "win32") {
      chmodSync(main_exe, "755")
    }
    execa.execaSync(main_exe, { cwd: __dirname, stdio: "inherit" })
  })

  it("should find llvm in the cache", async () => {
    const { binDir } = await setupLLVM(getVersion("llvm", "true"), directory, process.arch)
    await testBin("clang++", ["--version"], binDir)

    if (isGitHubCI()) {
      expect(binDir).toMatch(process.env.RUNNER_TOOL_CACHE ?? "hostedtoolcache")
    }

    expect(process.env.CC?.includes("clang")).toBeTruthy()
    expect(process.env.CXX?.includes("clang++")).toBeTruthy()

    if (isGitHubCI()) {
      expect(process.env.CC).toMatch("hostedtoolcache")
      expect(process.env.CXX).toMatch("hostedtoolcache")
    }
  })

  it("should setup clang-tidy and clang-format", async () => {
    const { binDir } = await setupClangTools(getVersion("llvm", "true"), directory, process.arch)
    await testBin("clang-tidy", ["--version"], binDir)
    await testBin("clang-format", ["--version"], binDir)
  })

  afterAll(async () => {
    await cleanupTmpDir("llvm")
  }, 100000)
})
