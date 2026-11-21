// OpenCode server plugin: Friday-style spoken replies via qtts.
//
// A prompt hook toggles the mode with "friday" and "friday off" and, while the
// mode is on, tells the model to finish each reply with a jarvis_speak tool
// call. The tool pipes that standalone version straight into qtts.
// This mirrors the Claude plugin's Friday mode without a second model call.
//
// author: andreasl

import { spawn } from "node:child_process"
import os from "node:os"
import path from "node:path"

import { Plugin } from "@opencode/plugin"

import { createState } from "./state"
import { expandHome, loadVoice } from "./voice"

const MODE_ON = "friday"
const TOOL_NAME = "jarvis_speak"

function normalizePrompt(text: string): string {
    return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")
}

function fridayRule(): string {
    return [
        "Friday mode: keep the on-screen reply full and detailed.",
        `As your last tool call before the final reply text, call ${TOOL_NAME} with a short, standalone spoken version of this reply; the tool pipes it into qtts and reads it aloud.`,
        "That version must make sense without seeing the screen and be shorter than the on-screen reply: a yes/no, or 1-3 sentences of about 15 words each.",
        "Draft it, then cut about a sixth: drop every clause, number and aside the listener does not need.",
        'Use TTS-friendly prose naming things concretely (which skill, line, PR, and what it does), never vague refs like "the draft", "one line" or "that fix"; brief paraphrases are fine.',
        "In the spoken version only: explanations or caveats when truly necessary, no TL;DR, no follow-ups.",
        'Any request naming audio as the destination ("send a longer text to audio", "give me a poem on audio", ...) means passing that content straight to ' +
            TOOL_NAME +
            " instead of a shorter summary.",
    ].join(" ")
}

export default Plugin.define({
    id: "barn-opencode-jarvis",
    async setup(ctx) {
        const options = (ctx.options ?? {}) as Record<string, unknown>
        const jarvisDir =
            typeof options.jarvisDir === "string"
                ? expandHome(options.jarvisDir)
                : path.join(os.homedir(), "Dev", "barn-claude-jarvis")
        const qttsPath = typeof options.qttsPath === "string" ? options.qttsPath : "qtts"
        const state = createState()

        await ctx.session.hook("prompt", async (event) => {
            const normalized = normalizePrompt(event.prompt.text)
            let mode = await state.readMode()

            if (normalized === MODE_ON) {
                mode = MODE_ON
                await state.writeMode(mode)
            } else if (normalized === `${MODE_ON}off` && mode === MODE_ON) {
                await state.clearMode()
                mode = undefined
            }

            if (mode === MODE_ON) {
                event.prompt.text = `${event.prompt.text.trimEnd()}\n\n${fridayRule()}`
            }
        })

        await ctx.tool.transform((editor) => {
            editor.add({
                name: TOOL_NAME,
                description:
                    "Write a short standalone TTS version of the reply and read it aloud with qtts. " +
                    "Use this as the last tool call of a reply in Friday mode.",
                input: {
                    type: "object",
                    properties: {
                        text: {
                            type: "string",
                            description: "The TTS-friendly prose to speak.",
                        },
                    },
                    required: ["text"],
                    additionalProperties: false,
                } as const,
                options: { codemode: true },
                async execute(input) {
                    const text = (input as { text?: string }).text?.trim()
                    if (!text) return { content: "No text to speak." }

                    const voice = await loadVoice(jarvisDir)

                    const child = spawn(
                        qttsPath,
                        [
                            "--voice",
                            voice.reference,
                            "--transcript",
                            voice.transcript,
                            "--prebuffer",
                            String(voice.prebufferSeconds),
                        ],
                        { stdio: ["pipe", "ignore", "ignore"], detached: true },
                    )
                    // qtts can exit before it reads everything, for example when its server
                    // fails to start; EPIPE is then expected and must not crash the plugin.
                    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
                        if (error.code !== "EPIPE") {
                            console.error(`[barn-opencode-jarvis] qtts stdin failed: ${error.message}`)
                        }
                    })
                    child.stdin.end(`${text}\n`)
                    child.on("error", (error: Error) => {
                        console.error(`[barn-opencode-jarvis] qtts failed: ${error.message}`)
                    })
                    child.unref()

                    return { content: `Speaking ${text.length} characters.` }
                },
            })
        })
    },
})
