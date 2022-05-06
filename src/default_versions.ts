import { Inputs, Opts } from "./main"

const DefaultVersions: Record<string, string> = {
  llvm: "13.0.0", // https://github.com/llvm/llvm-project/releases
  clangtidy: "13.0.0",
  clangformat: "13.0.0",
  ninja: "1.10.2", // https://github.com/ninja-build/ninja/releases
  cmake: "3.23.1", // https://github.com/Kitware/CMake/releases
  gcovr: "5.0", // https://pypi.org/project/gcovr/
  conan: "1.47.0", // https://github.com/conan-io/conan/releases
  meson: "0.61.4", // https://github.com/mesonbuild/meson/releases
  python: "3.8.10",
  kcov: "40", // https://github.com/SimonKagstrom/kcov/releases
  task: "3.12.0", // https://github.com/go-task/task/releases
  doxygen: "1.9.1", // https://packages.ubuntu.com/search?suite=all&arch=any&searchon=names&keywords=doxygen
  gcc: process.platform === "win32" ? "11.2.0.07112021" : "11", // https://community.chocolatey.org/packages/mingw#versionhistory and // https://packages.ubuntu.com/search?suite=all&arch=any&searchon=names&keywords=gcc
}

/** Get the default version if passed true or undefined, otherwise return the version itself */
export function getVersion(name: string, version: string | undefined, osVersion: number[] | null = null) {
  if (useDefault(version, name)) {
    // llvm on linux
    if (process.platform === "linux" && ["llvm", "clangtidy", "clangformat"].includes(name)) {
      // choose the default version for llvm based on ubuntu
      if (osVersion !== null) {
        if ([20, 18, 16].includes(osVersion[0]) && osVersion[1] === 4) {
          return `${osVersion[0] === 18 ? "13.0.1" : "13.0.0"}-ubuntu-${osVersion[0]}.0${osVersion[1]}`
        }
      }
    }
    // anything else
    return DefaultVersions[name]
  } else {
    return version ?? ""
  }
}

function useDefault(version: string | undefined, name: string) {
  return version === "true" || (version === undefined && name in DefaultVersions)
}

export function syncVersions(opts: Opts, tools: Inputs[]): boolean {
  for (let i = 0; i < tools.length; i++) {
    // tools excluding i_tool
    const otherTools = tools.slice(0, i).concat(tools.slice(i + 1))

    const tool = tools[i]

    if (!useDefault(opts[tool], tool)) {
      for (let i_other = 0; i_other < otherTools.length; i_other++) {
        const otherTool = otherTools[i_other]
        const useDefaultOtherTool = useDefault(opts[otherTool], otherTools[i_other])
        if (useDefaultOtherTool) {
          // use the same version if the other tool was requested with the default
          opts[otherTool] = opts[tool]
        } else if (opts[tool] !== opts[otherTools[i_other]]) {
          // error if different from the other given versions
          return false
        }
      }
    }
  }
  return true
}
