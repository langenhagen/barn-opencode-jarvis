// Read local TTS settings from this repo's config.sh. Voice samples stay in
// barn-claude-jarvis, so both plugins share the same recordings.
//
// author: andreasl

import { access, readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const FALLBACK_VOICE = "jeff"
const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export interface VoiceSettings {
    readonly voiceName: string
    readonly reference: string
    readonly transcript: string
    readonly prebufferSeconds: number
}

export function expandHome(value: string): string {
    if (value === "~") return os.homedir()
    if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2))
    return value
}

async function exists(file: string): Promise<boolean> {
    try {
        await access(file)
        return true
    } catch {
        return false
    }
}

function readSetting(config: string, key: string): string | undefined {
    const match = config.match(new RegExp(`^\\s*${key}\\s*=\\s*["']?([^"'\\s#]+)`, "m"))
    return match?.[1]
}

export async function loadVoice(voicesDir: string): Promise<VoiceSettings> {
    const root = expandHome(voicesDir)
    const configFile = path.join(PLUGIN_ROOT, "config.sh")
    let configured = FALLBACK_VOICE
    let prebufferSeconds = 0

    // Re-read on every call: config.sh is outside OpenCode's watched config
    // directories, so a saved change takes effect without a plugin reload.
    try {
        const config = await readFile(configFile, "utf8")
        configured = readSetting(config, "voice_name") ?? FALLBACK_VOICE
        const raw = readSetting(config, "qtts_prebuffer_seconds")
        if (raw !== undefined && Number.isFinite(Number(raw))) {
            prebufferSeconds = Number(raw)
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }

    async function settingsFor(name: string): Promise<VoiceSettings | undefined> {
        const voiceDir = path.join(root, "voices", name)
        const reference = path.join(voiceDir, "reference.wav")
        const transcript = path.join(voiceDir, "transcript.txt")
        if (!(await exists(reference)) || !(await exists(transcript))) return undefined
        return { voiceName: name, reference, transcript, prebufferSeconds }
    }

    const voice = (await settingsFor(configured)) ?? (await settingsFor(FALLBACK_VOICE))
    if (!voice) {
        throw new Error(`No voice found in ${path.join(root, "voices")}: tried ${configured} and ${FALLBACK_VOICE}`)
    }
    return voice
}
