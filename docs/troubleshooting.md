# Troubleshooting

[Back to the README](../README.md)

## Nothing shows up

Run `claude --debug` and look for lines starting with `cretan-cat`. If they
say hook modules are turned off, your Claude Code doesn't have the feature
yet.

## He disappeared

You may have hidden him, in this session or an earlier one: type `/cat show`.

## He doesn't sit up for permission prompts

Where an organization manages Claude Code, permission-request hooks run only
for plugins it lists in its managed settings, so he misses those prompts: no
sitting up, no *mew?*, and a long prompt may even bore him to sleep.
Questions and plans still wake him.

## No sound

Sound is off unless you turn it on in `/config`, and it plays on macOS only.
See [Sound](settings.md#sound).

## `resolution: high` looks just like low

The picture shows only in kitty or Ghostty, and not under tmux or screen.
Type `/cat config`: its `resolution` row says whether the picture is on and,
if not, why. The reasons are listed under
[Is the picture on?](settings.md#is-the-picture-on)
