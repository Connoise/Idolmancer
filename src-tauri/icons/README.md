# Icons

Tauri needs platform icons here before bundling. They are not checked in; generate
them from a single source image with the Tauri CLI:

```bash
pnpm tauri icon path/to/idolmancer-logo.png
```

This produces `32x32.png`, `128x128.png`, `icon.ico`, and the other sizes referenced
by `../tauri.conf.json`.
