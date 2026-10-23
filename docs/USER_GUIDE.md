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
| **Contents** | Open a side panel listing every heading; click one to jump to it |
| **Theme** | Switch between light and dark. Your choice is remembered |
| **Save** | Save your edits (see [Editing and saving](#editing-and-saving)) |
| **&#8943;** | Export, discard a draft, turn the extension off for this site, open settings |

The words and reading-time estimate appear next to the buttons.

### What is rendered

- **GitHub-flavoured Markdown:** tables, task lists, strikethrough, links and bare URLs, fenced code with
  syntax highlighting.
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
  `![logo](images/logo.png)` shows the image sitting next to your file.

### Wide content

There is no frame around the page. Text keeps a comfortable line length, while **tables, code blocks and
diagrams scroll sideways inside their own box** when they are too wide, so the page itself never scrolls
sideways.

### Folding and copying

Click the small arrow beside a level 2 to 4 heading to fold that section. Hover a code block to reveal its
**Copy** button.

## Editing and saving

### Start editing

Click **Edit** or **Split**, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> to flip between reading and
editing. **Split** shows the editor and the rendered page side by side and keeps them scrolled together.

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
- **Local files.** Press **Save** or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>S</kbd> to download the edited file
  under its original name, then replace the original with it. Until you do, the original on disk is unchanged.
- **Files on websites.** Edits cannot be sent back to the server. Your draft stays in the extension, and **Save**
  refreshes it. Use **Export Markdown** to get a copy.

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
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> | Centered reading column on / off |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> | Contents panel |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> | Reload the original file (asks first if you have edits) |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> | Switch between reading and editing |
| <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>S</kbd> | Save (while editing, or when there are unsaved changes) |

The first four are browser-level shortcuts: change or clear them at `chrome://extensions/shortcuts`. The edit
and save shortcuts work while the page has focus.

## Settings

Open the toolbar icon for the quick settings, and choose **All settings** for the rest. Settings sync across
your devices through your browser account where supported, and take effect immediately on open pages.

| Section | Options |
|---------|---------|
| Appearance | Theme, font, size, centered column, contents panel, reading time |
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

**A Mermaid diagram shows an error.** The message names the problem in the diagram text. Fix the syntax; the rest
of the page is unaffected.

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
- Raw HTML inside Markdown is shown as text, not executed.
- Word export covers common structure; images and diagrams are not included.
- Front matter is read as simple `key: value` pairs. Nested YAML is displayed as written.
