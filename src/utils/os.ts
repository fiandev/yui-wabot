import { arch, platform, release, cpus, totalmem, uptime } from "os"
import { networkInterfaces } from "os"

export function os () {
    const nets = networkInterfaces()
    const results = Object.create(null)

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
            const familyV4Value = typeof net.family === "string" ? "IPv4" : 4
            if (net.family === familyV4Value && !net.internal) {
                if (!results["ip"]) {
                    results["ip"] = net.address
                }
            }
        }
    }

    function dynamicTime (time: number) {
        const hours = Math.floor(time / 60 / 60)
        const minutes = Math.floor((time - (hours * 60 * 60)) / 60)
        const seconds = time - (hours * 60 * 60) - (minutes * 60)

        return `${hours ? `${hours} hour${hours > 1 ? "s" : ""}` : ""} ${minutes ? `${minutes} minute${minutes > 1 ? "s" : ""}` : ""} ${seconds ? `${seconds} second${seconds > 1 ? "s" : ""}` : ""}`.trim()
    }

    return {
        platform: process.platform,
        runtime: process.version,
        os: `${platform()} ${release()}`,
        ip: results["ip"] || "",
        cpu: cpus()[0].model,
        memory: `${Math.floor(totalmem() / 1024 / 1024)} MB`,
        uptime: dynamicTime(uptime()),
    }
}
