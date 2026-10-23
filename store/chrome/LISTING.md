# Chrome Web Store submission

Package to upload: `dist/zips/markdown-studio-chrome-<version>.zip`, produced by `npm run package:chrome`.

## Store listing

**Name:** Markdown Studio

**Summary (132 characters max):**
View and edit Markdown files in your browser, with live preview, diagrams, math and tables that scroll.

**Category:** Developer Tools

**Language:** English

**Description:**

Open a Markdown file in your browser and read it as a clean, formatted page. Switch to the editor when you need
to change something.

Markdown Studio renders `.md`, `.markdown`, `.mdx`, `.mdc`, `.mkd` and `.txt` files from websites and from your
own computer.

READING
- GitHub-flavoured Markdown: tables, task lists, strikethrough, syntax-highlighted code
- Callouts, footnotes, front matter, emoji shortcodes
- Mermaid diagrams and KaTeX math
- A contents panel, section folding and a copy button on code
- Light and dark themes that follow your system
- A free-flow layout that fits your window: no frame around the page, and tables and code wrap to the available width
  (or scroll inside their own box if you prefer)

EDITING
- A full editor with view, edit and split modes, a live preview and a draggable divider to resize the panes
- Formatting shortcuts and a formatting bar, including a table aligner
- Paste or drop images straight into a document
- Drafts are saved automatically and restored when you come back
- Export to Markdown, HTML, Word or PDF

PRIVATE
- No account, no tracking, no analytics. Documents are processed on your device.
- PlantUML diagrams are optional and off by default, because they need a server to draw them.

Tip: to open files on your computer, turn on "Allow access to file URLs" for the extension at
chrome://extensions.

**Screenshots** (1280x800, in `screenshots/`):

1. `1-reading.png`: a formatted document with callout, checklist and a wide table
2. `2-contents.png`: the contents panel
3. `3-split-edit.png`: split view with live preview
4. `4-dark-diagram-math.png`: dark theme with a Mermaid diagram and math
5. `5-settings.png`: the settings page

## Privacy practices tab

**Single purpose:** Display Markdown and text files as formatted documents and let the user edit them.

**Permission justifications**

- `storage`: saves the user's settings, drafts of files they edit, and the list of sites where the extension is
  turned off. Nothing leaves the device (settings may sync through the user's own browser account).
- Host access (content script on `.md`, `.markdown`, `.mdx`, `.mdc`, `.mkd`, `.txt` URLs over http, https and
  file): the extension must run on pages that are Markdown files in order to replace the raw text with a rendered
  page. It does not run on any other page and requests no broader host permission.

**Remote code:** No. All code ships in the package. PlantUML, when the user enables it, sends diagram text to a
server and receives an image; no code is downloaded.

**Data usage:** Does not collect or transmit any of the listed user data types. Certify the three limited-use
statements.

**Privacy policy URL:** must be publicly reachable. `PRIVACY.md` lives in a private repository today, so publish
it first (make the repository public, enable GitHub Pages, or paste the text into a public page) and paste that
URL into the form.

## Notes for the reviewer

Open any raw Markdown file, for example the "Raw" view of a README on a public repository. The page is replaced by
a rendered document with a toolbar. Press Alt+Shift+E (or choose Edit) to open the editor. To test a local file,
turn on "Allow access to file URLs" for the extension, then open a `file:///...md` path.

## Before submitting

- [ ] Register a Chrome Web Store developer account (one-time registration fee) and verify the contact email
- [ ] `npm test` and `npm run typecheck` pass
- [ ] `npm run package:chrome`, then upload the zip
- [ ] Add the five screenshots and a 128x128 icon (already in the package at `icons/icon-128.png`)
- [ ] Fill the privacy practices tab as above and add the public privacy policy URL
- [ ] Choose visibility: start with **Unlisted** or **Private** (trusted testers) and widen after a trial
- [ ] Submit for review; reviews of extensions that run on many pages can take longer than usual
- [ ] Before each update, raise `version` in `package.json`; the store rejects an upload that does not increase it

## Optional: promotional images

A 440x280 small promo tile is optional and not generated here.
