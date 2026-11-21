// State files for the OpenCode jarvis plugin. Kept separate from the Claude
// plugin's cache files so the two cannot overwrite each other.
//
// author: andreasl

import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

export interface JarvisState {
    readonly modeFile: string
    readonly messageFile: string
    readMode(): Promise<string | undefined>
    writeMode(mode: string): Promise<void>
    clearMode(): Promise<void>
    writeMessage(text: string): Promise<void>
}

export function createState(): JarvisState {
    const stateDir = path.join(os.homedir(), ".cache", "barn-opencode-jarvis")
    const modeFile = path.join(stateDir, "mode")
    const messageFile = path.join(stateDir, "last-message.txt")

    async function ensureDir(): Promise<void> {
        await mkdir(stateDir, { recursive: true })
    }

    return {
        modeFile,
        messageFile,
        async readMode() {
            try {
                const value = (await readFile(modeFile, "utf8")).trim()
                return value || undefined
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
                throw error
            }
        },
        async writeMode(mode) {
            await ensureDir()
            await writeFile(modeFile, `${mode}\n`, "utf8")
        },
        async clearMode() {
            await rm(modeFile, { force: true })
        },
        async writeMessage(text) {
            await ensureDir()
            await writeFile(messageFile, `${text}\n`, "utf8")
        },
    }
}
