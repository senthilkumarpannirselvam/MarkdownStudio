# Markdown Studio

A browser extension that renders Markdown files in place and lets you edit them. Open any `.md`, `.markdown`,
`.mdx`, `.mdc`, `.mkd` or `.txt` URL, or a local file, and it becomes a readable page with a live editor one
keystroke away.

- **Reading:** GitHub-flavoured Markdown, syntax highlighting, callouts, footnotes, front matter, Mermaid
  diagrams, KaTeX math, contents panel, light and dark themes.
- **Free-flow layout:** no boxed frame. Prose keeps a comfortable measure, and wide tables and code blocks
  scroll inside their own container instead of stretching the page.
- **Editing:** CodeMirror 6 with view, edit and split modes, formatting shortcuts, drafts that survive a reload,
  and export to Markdown, HTML, Word and PDF.
- **Private by default:** no accounts, no analytics, no network requests of its own. See [PRIVACY.md](PRIVACY.md).

Chrome is the primary target. Firefox and Safari builds are produced from the same source but have not been
tested in a real browser yet.

## Documentation

- [User guide](docs/USER_GUIDE.md): installing, reading, editing, saving, settings and troubleshooting
- [Privacy policy](PRIVACY.md)
- [Chrome Web Store listing and submission checklist](store/chrome/LISTING.md)

## Development

Requires Node.js 20 or later.

```bash
npm install
npm run build:chrome      # dist/chrome, load unpacked at chrome://extensions
npm test                  # unit tests
npm run typecheck
```

| Command                | Purpose                                                              |
|------------------------|----------------------------------------------------------------------|
| `npm run build`        | Build Chrome, Firefox and Safari into `dist/<target>`                |
| `npm run package:chrome` | Production Chrome build, zipped to `dist/zips/` for the Web Store  |
| `npm run firefox:run`  | Run the Firefox build in a temporary profile (needs Firefox)         |
| `npm run icons`        | Regenerate the PNG icons from `assets-src/icon.svg`                  |
| `npm run dev`          | Rebuild Chrome on every change, with source maps                     |

### Layout

```
src/background/   service worker: forwards keyboard commands, opens the options page
src/content/      page UI. loader.ts is the only declared content script; it imports main.js
src/popup/        toolbar popup (React)
src/options/      settings page (React)
src/shared/       storage, settings validation, drafts, block list
public/           static files copied as-is: icons and the content stylesheet
scripts/          build, zip and icon helpers
store/            Chrome Web Store listing text
```

Manifest content scripts cannot use ES modules or code splitting, so `content/loader.js` (a one-line stub)
imports `content/main.js` from the extension at runtime. The editor, diagram renderers, math and exporters
are separate chunks that load only when used.

### Firefox

```bash
npm run build:firefox
npm run firefox:run
```

### Safari

Safari needs macOS and Xcode to package the extension.

```bash
npm run build:safari
# on a Mac:
xcrun safari-web-extension-converter ./dist/safari --project-location ./safari-wrapper \
  --app-name "Markdown Studio" --bundle-identifier dev.markdownstudio.app --no-prompt
```

Then build the generated project in Xcode and enable the extension in Safari's settings.

## Releasing

1. Update `version` in `package.json`.
2. `npm run package:chrome` and upload `dist/zips/markdown-studio-chrome-<version>.zip`.
3. Tag `vX.Y.Z` to have CI attach all three zips to a GitHub release.

## License

MIT, see [LICENSE](LICENSE).
