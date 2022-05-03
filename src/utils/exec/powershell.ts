import * as execa from "execa"
import which from "which"

let powershell: string | undefined

export function execPowershell(command: string) {
  if (powershell === undefined) {
    const maybePwsh = which.sync("pwsh", { nothrow: true })
    if (maybePwsh !== null) {
      powershell = maybePwsh
    }
    const maybePowerShell = which.sync("powershell", { nothrow: true })
    if (maybePowerShell !== null) {
      powershell = maybePowerShell
    }
  }
  if (powershell === undefined) {
    throw new Error("Could not find powershell")
  }

  execa.execaSync(powershell, ["-c", command], { stdio: "inherit" })
}
