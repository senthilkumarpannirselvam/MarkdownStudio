# Markdown Studio User Guide

Markdown Studio turns Markdown files into readable pages and lets you edit them without leaving the browser.

- [Getting started](#getting-started)
- [Reading a document](#reading-a-document)
- [Editing and saving](#editing-and-saving)
- [Exporting](#exporting)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [Troubleshooting](#troubleshooting)
- [Limits](#limits)

## Getting started

### Install

Install Markdown Studio from the Chrome Web Store, or load it manually while testing:

1. Download or build the extension folder (`dist/chrome`).
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Choose **Load unpacked** and select the folder.

### Open files stored on your computer

Chrome does not let extensions read local files until you allow it.

1. Open `chrome://extensions` and select **Details** on Markdown Studio.
2. Turn on **Allow access to file URLs**.

Files on websites work without this step.

### Open a Markdown file

Open any address that ends in `.md`, `.markdown`, `.mdx`, `.mdc`, `.mkd` or `.txt`, with or without a query
string, or drag a local file into a tab. The file is shown as a formatted page.

Examples: a README on GitHub's "Raw" view, a documentation file on your intranet, or `file:///C:/notes/todo.md`.

Pages that are real web pages are never touched. If a server sends HTML for a `.md` address, you see the page as
the server intended.

## Reading a document

The toolbar sits at the top of the page.

| Control | What it does |
|---------|--------------|
| **View / Edit / Split** | Switch between reading, editing, and editing with a live preview |
| **Sections** | One icon. Closes every section, or opens them when they are all closed. Shown when the page has more than one foldable heading |
| **Contents** | List icon. Open a side panel of every heading; click one to jump to it |
| **Theme** | Sun or moon icon. Switch between light and dark. Your choice is remembered |
| **Save** | Save icon. Save your edits (see [Editing and saving](#editing-and-saving)) |
| **&#8943;** | Export, discard a draft, turn the extension off for this site, open settings |

The words and reading-time estimate appear next to the buttons.

### What is rendered

- **GitHub-flavoured Markdown:** tables, task lists, strikethrough, links and bare URLs, fenced code with
  syntax highlighting.
- **Line breaks:** a new line in the file starts a new line on the page. A blank line starts a new paragraph.
  Inside a table cell, write `<br>` where the line should break.
- **Callouts:** a quote that starts with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]`.
- **Footnotes, definition lists, `H~2~O`, `x^2^`, `==highlight==`, `++inserted++`, abbreviations, emoji
  shortcodes such as `:tada:`.
- **Front matter** (YAML, TOML or JSON at the top of the file) is shown as a small collapsible card instead of
  raw text.
- **Math** with KaTeX: `$x^2$` inline and `$$ ... $$` for display. A dollar sign followed by a space, or a price
  such as `$5`, is left as text.
- **Diagrams:** `mermaid` code blocks are drawn as diagrams. `dot` / `graphviz` blocks work if you turn them on
  in settings.
- **Images and links** with relative paths are resolved against the file's own location, so a local
  `![logo](images/logo.png)` shows the image sitting next to your file. For a local file these also work: a Windows
  path (`C:\pics\logo.png`), a `file:///` address, backslashes in a relative path, and a path with spaces written
  in angle brackets (`![logo](<my images/logo 2.png>)`).
- **HTML inside Markdown** such as `<img src="logo.png" width="120">`, `<p align="center">`, `<details>`,
  `<summary>`, `<kbd>`, `<sub>` and `<sup>` is shown. Scripts, frames, forms, event handlers and styles are always
  removed. You can turn HTML off in settings.
- **Anything that cannot be shown is marked, not hidden.** An image that fails to load becomes a visible note
  saying which image and why. A figure the exporting tool left out (a placeholder such as
  `[embedded content: ...]`) is labelled as missing. Image syntax that Markdown does not understand is highlighted.
  A diagram that fails shows its error above its source. A **⚠** button in the toolbar counts these and lists them;
  click an entry to jump to it.

### Page width and wide content

There is no frame around the page, and it **fits your window**: text, tables and code use the available width and
reflow when you resize the window. Ordinary words break at a space. A long URL or path breaks only when it does
not fit on the line. The page itself does not scroll sideways.

Choose how wide the page gets in the toolbar popup or in settings:

- **Fit to screen** (default): the full width of the window
- **Wide**: capped at about 120 characters, centered
- **Reading column**: a 72-character column, centered, easiest for long prose

Two more options decide what happens to content that is wider than the page:

- **Wrap table cells** (on by default): columns share the width and cell text wraps. Turn it off to keep each row on
  one line and scroll the table sideways inside its own box.
- **Wrap code lines** (on by default): long code lines wrap. Turn it off to scroll code sideways inside its box.

Press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> to switch between fit-to-screen and the reading column.

### Folding and copying

Click the arrow beside a level 2, 3, or 4 heading to fold that section. Open it again to show the text, pictures,
and diagrams inside it. When the page has more than one of these headings, one toolbar icon closes every
section. Click it again to open them. Hover a code block to reveal its **Copy** button.

## Editing and saving

### Start editing

Click **Edit** or **Split**, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> to flip between reading and
editing. **Split** shows the editor and the rendered page side by side and keeps them scrolled together. Drag the bar
between them to make either side larger or smaller (or focus it and press the left and right arrow keys). Double-click
the bar to go back to an even split. Your choice is remembered.

While editing you get:

- a formatting bar (bold, italic, strikethrough, code, link, image, heading, quote, lists, task list, code
  block, table, and **Align** to tidy table columns);
- shortcuts <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>B</kbd> bold, <kbd>I</kbd> italic, <kbd>K</kbd> link,
  <kbd>E</kbd> inline code, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> code block;
- find with <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>F</kbd>;
- paste or drag in a PNG, JPEG, GIF or WebP image to embed it in the document (images over about 1.5 MB are
  skipped to keep documents small).

You can also tick task-list checkboxes while reading; the change is written into the Markdown.

### Where your edits go

A browser extension cannot overwrite a file on your disk. Markdown Studio therefore works like this:

- **Drafts.** Every change is saved automatically, a couple of seconds after you stop typing, as a *draft*
  stored in the extension. The status text next to the toolbar shows "Draft saved". If you reload the page, close
  the tab or restart the browser, your draft is restored and the status reads "Restored your saved draft".
- **Local files.** Press the save icon or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>S</kbd> to download the edited file
  under its original name, then replace the original with it. Until you do, the original on disk is unchanged.
- **Files on websites.** Edits cannot be sent back to the server. Your draft stays in the extension, and the save
  icon refreshes it. Use **Export Markdown** to get a copy.

To throw an edit away, open the **&#8943;** menu and choose **Discard draft and reload**.

Manage every draft in the settings page under **Saved drafts**, where you can also compare a draft with the
current online version.

## Exporting

Open the **&#8943;** menu:

- **Export Markdown:** the current text as a `.md` file.
- **Export HTML:** a single self-contained page of the rendered document.
- **Export Word (.docx):** headings, paragraphs, lists, code, quotes and tables.
- **Print / save as PDF:** opens the browser's print dialog. The toolbar and editor are hidden for printing;
  choose **Save as PDF** as the destination.

Files are saved by your browser's normal download behaviour. Turn on "Ask where to save each file" in Chrome's
download settings if you want to pick the folder each time.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> | Light / dark theme |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> | Switch between fit-to-screen and reading width |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> | Contents panel |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> | Reload the original file (asks first if you have edits) |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> | Switch between reading and editing |
| <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>S</kbd> | Save (while editing, or when there are unsaved changes) |

The first four are browser-level shortcuts: change or clear them at `chrome://extensions/shortcuts`. The edit
and save shortcuts work while the page has focus.

## Settings

Open the toolbar icon for quick settings. **Enable Markdown Studio** turns rendering on or off for every file.
An open Markdown page reloads when you flip it. Choose **All settings** for the rest. Settings sync across
your devices through your browser account where supported, and take effect immediately on open pages.

| Section | Options |
|---------|---------|
| Appearance | Theme, font, size, page width, wrap tables and code, contents panel, reading time |
| Rendering | Callouts, footnotes, emoji, wiki links, front matter card, copy buttons, section folding |
| Diagrams and math | Mermaid, KaTeX, Graphviz, PlantUML and its server |
| Editor | Open in edit mode, synchronized scrolling, minimap, autosave delay |
| Online files | Refresh automatically when the file changes on the server |
| Custom CSS | Your own styles; prefix selectors with `.ms-prose` to target the document |
| Sites where it is off | Hosts to leave alone; local files are listed as `local` |
| Saved drafts | Compare or discard stored drafts |

**PlantUML sends data off your device.** PlantUML diagrams are drawn by a server, so turning it on sends the text
of each `plantuml` block to the server named in settings (plantuml.com by default). Use your own server for
private diagrams. It is off by default.

## Troubleshooting

**A Markdown file stays plain text.** Open the extension icon and turn on **Enable Markdown Studio**. The page
reloads and renders. If it is still plain text, the site may be on your off list (below), or a local file may
need **Allow access to file URLs**.

**A local file shows as plain text.** Turn on **Allow access to file URLs** for the extension (see
[Getting started](#open-files-stored-on-your-computer)), then reload the file.

**A `.md` address downloads instead of displaying.** Some servers send Markdown with a type browsers download,
such as `application/octet-stream`. Chrome never shows these as a page, so there is nothing for the extension to
render. Ask the server owner to serve them as `text/plain` or `text/markdown`.

**A website's `.txt` or `.md` file is rendered and I would rather see raw text.** Open the **&#8943;** menu and
choose **Don't render on this site**. Reverse it in settings under **Sites where it is off**.

**My edits disappeared.** Drafts are kept per exact address. If the address changed (a different query string, a
moved file) it is a different draft. Check **Saved drafts** in settings. Choosing **Discard draft and reload**, or
removing the extension, deletes drafts.

**"Could not save: extension storage is full."** Drafts live in the extension's storage, which is limited (about
10 MB). Discard old drafts in settings, and avoid embedding many large images.

**A Mermaid diagram shows an error.** The message names the problem in the diagram text, and the diagram's source
stays visible below it. Fix the syntax; the rest of the page is unaffected.

**A diagram or image is missing.** Click the **⚠** button in the toolbar to see what could not be shown and why.
The common causes:

- *"This figure is not included in the file"*: the document has only a placeholder such as
  `[embedded content: ...]`. Some tools leave this where a picture or diagram was when they export to Markdown, so
  the image data was never in the file. Re-export with images or diagrams included, or replace the placeholder with
  a Mermaid block or an image link.
- *"Image not loaded"* for a local file: the file was not found, or **Allow access to file URLs** is off for the
  extension. Check the path and the switch.
- *"Image not loaded"* for a web address: the server did not return an image, or blocked the request.
- *Image not recognised*: the path contains spaces. Write it in angle brackets: `![alt](<my image.png>)`.
- A diagram stays as code: its language must be `mermaid` (or `mmd`), `dot`/`graphviz`/`gv`, or `plantuml`.
  Graphviz and PlantUML are off until you turn them on in settings.

**The page is not rendered at all.** Files larger than about 3 million characters are left as plain text to keep
the browser responsive. The site may also be on your off list.

**Shortcuts do nothing.** Another extension or the browser may own the same keys. Reassign them at
`chrome://extensions/shortcuts`.

**Printing shows extra interface.** Use the **&#8943;** menu's **Print / save as PDF** or the browser's print
command; the toolbar and editor are hidden automatically in print.

## Limits

- Edits to local files are saved by download; the extension cannot write to your disk directly.
- Only `.md`, `.markdown`, `.mdx`, `.mdc`, `.mkd` and `.txt` addresses are handled, and only when the browser
  displays them as text. `.mdx` and `.mdc` are rendered as ordinary Markdown; JSX is not executed.
- HTML inside Markdown is filtered to a safe set of tags. Anything outside that set, including styles, scripts,
  frames and forms, is removed.
- Math written as `\( ... \)` or `\[ ... \]` is not recognised; use `$ ... $` and `$$ ... $$`.
- Word export covers common structure; images and diagrams are not included.
- Front matter is read as simple `key: value` pairs. Nested YAML is displayed as written.
