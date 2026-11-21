# barn-opencode-jarvis

OpenCode server plugin that speaks a short, standalone version of each reply
with [`qtts`](https://github.com/langenhagen/qttsserv). It is the OpenCode
counterpart to [barn-claude-jarvis](https://github.com/langenhagen/barn-claude-jarvis)'s
Friday mode.

While Friday mode is on, the on-screen reply stays normal. A prompt hook tells
the model to add one last tool call, `jarvis_speak`, carrying a TTS-friendly
version of the reply. The tool writes that text to
`~/.cache/barn-opencode-jarvis/last-message.txt` and starts `qtts` on the file.
No second model call is needed.

## Triggering The Plugin

Say `friday` to switch the mode on and `friday off` to switch it off. The mode
lives in `~/.cache/barn-opencode-jarvis/mode`; no file means off. Punctuation
and whitespace are ignored, so a dictated "Friday." matches too.

The mode is off by default. The first reply after `friday` already follows the
rule. Any prompt naming audio as the destination ("send a poem to audio")
uses `jarvis_speak` directly, even when the mode is off.

## Configuration

The plugin reads `voice_name` and `qtts_prebuffer_seconds` from
`barn-claude-jarvis/config.sh` and the voice samples from its `voices/`
directory. Change the voice there, once, for both Claude and OpenCode.
An unknown name falls back to `jeff`. The config file is re-read on every
spoken reply, so edits take effect immediately.

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
        "jarvisDir": "/abs/path/to/barn-claude-jarvis"
      }
    }
  ]
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
```

The plugin imports `@opencode/plugin` for types only; OpenCode resolves it at
runtime. There is no build step: OpenCode loads the TypeScript source
directly.

## Notes

- The tool starts `qtts` detached and does not wait for playback to end.
- If the model ignores the instruction, nothing is spoken. There is no
  automatic fallback from the last on-screen reply.
- Two sessions speaking at once share one message file and can overlap.

## License

See [LICENSE](LICENSE) file.
