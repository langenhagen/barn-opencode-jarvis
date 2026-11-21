# barn-opencode-jarvis

OpenCode server plugin that speaks a short, standalone version of each reply
with [`qtts`](https://github.com/langenhagen/qttsserv). It is the OpenCode
counterpart to [barn-claude-jarvis](https://github.com/langenhagen/barn-claude-jarvis)'s
Friday mode.

While Friday mode is on, the on-screen reply stays normal. A prompt hook tells
the model to add one last tool call, `jarvis_speak`, carrying a TTS-friendly
version of the reply. The tool pipes that text straight into `qtts`; no message
file is involved. No second model call is needed.

## Triggering The Plugin

Say `friday` to switch the mode on and `friday off` to switch it off. The mode
lives in `~/.cache/barn-opencode-jarvis/mode`; no file means off. Punctuation
and whitespace are ignored, so a dictated "Friday." matches too.

The mode is off by default. The first reply after `friday` already follows the
rule. Any prompt naming audio as the destination ("send a poem to audio")
uses `jarvis_speak` directly, even when the mode is off.

## Configuration

Local settings live in [`config.sh`](config.sh), which the plugin reads on
every spoken reply. The file is git-ignored, so changes stay out of version
control. To create it, copy the sample:

```bash
cp config.sh.sample config.sh
```

It sets:

- `voice_name`: the TTS voice, a subdirectory of the `barn-claude-jarvis`
  clone's `voices/`. A name without a matching directory falls back to `jeff`.
- `qtts_prebuffer_seconds`: how much audio `qtts` buffers before playback.
  Defaults to `0`.

Without `config.sh`, the defaults apply. Voice samples still come from the
`barn-claude-jarvis` clone, so Claude and OpenCode can pick different voices.

OpenCode plugin options:

- `jarvisDir`: path to the `barn-claude-jarvis` clone. Defaults to
  `~/Dev/barn-claude-jarvis`.
- `qttsPath`: executable to run. Defaults to `qtts`.

## Install

Clone the repo, then add it to `~/.config/opencode/opencode.json(c)`:

```jsonc
{
    "$schema": "https://opencode.ai/config.json",
    "plugins": [
        {
            "package": "/abs/path/to/barn-opencode-jarvis",
            "options": {
                "jarvisDir": "/abs/path/to/barn-claude-jarvis",
            },
        },
    ],
}
```

Config changes reload automatically. Run `/reload` if the plugin does not show
up in `/plugins`.

## Requirements

- OpenCode 2.
- `qtts` on `PATH`, from [qttsserv](https://github.com/langenhagen/qttsserv).
- A `barn-claude-jarvis` clone with its `voices/` directory.

## Development

```shell
npm install
npm run typecheck
npm run lint
npm run format:check
```

The plugin imports `@opencode/plugin` for types only; OpenCode resolves it at
runtime. There is no build step: OpenCode loads the TypeScript source
directly.

## Notes

- The tool starts `qtts` detached and does not wait for playback to end.
- If the model ignores the instruction, nothing is spoken. There is no
  automatic fallback from the last on-screen reply.
- Each call pipes its own text, so concurrent sessions cannot overwrite a
  shared message file.

## License

See [LICENSE](LICENSE) file.
