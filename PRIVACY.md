# Privacy Policy

Markdown Studio does not collect, transmit, sell or share any personal data. It has no server, no account and
no analytics or telemetry.

## What the extension reads

When you open a Markdown or text file (`.md`, `.markdown`, `.mdx`, `.mdc`, `.mkd`, `.txt`) the extension reads
the text of that page in order to render it. The text is processed locally in your browser and is not sent
anywhere.

## What it stores

Everything is stored in your browser through the extension storage API:

| Data | Where | Why |
|------|-------|-----|
| Your settings (theme, font, toggles, custom CSS) | `storage.sync`, so your browser may sync it between your own devices | Remember your preferences |
| Drafts of files you edited, keyed by the file's address | `storage.local`, on this device only | Keep edits across reloads |
| Sites where you turned the extension off | `storage.local`, on this device only | Respect your choice |

You can delete drafts and the blocked-site list from the extension's settings page. Removing the extension
removes everything it stored.

## Network activity

The extension makes no network requests of its own, with these exceptions that you control:

- **Images and links in a document** load the same way they would on any web page. A Markdown file that
  references a remote image causes your browser to request that image from its host.
- **PlantUML diagrams** (off by default). PlantUML cannot run in a browser, so if you turn it on in settings,
  the text of each `plantuml` code block is sent to the PlantUML server shown in settings, which is
  `https://www.plantuml.com/plantuml` unless you change it. Leave this off, or point it at your own server, to
  keep diagram text private.
- **Online files with refresh turned on** (off by default). The extension periodically asks the same server that
  delivered the file whether it has changed.

## Permissions

- `storage`: save settings, drafts and the blocked-site list.
- Access to `.md`, `.markdown`, `.mdx`, `.mdc`, `.mkd` and `.txt` pages (http, https and local files): needed to
  display those pages as formatted documents. The extension does not run on any other page.

## Remote code

The extension contains all of its code. It does not download or execute code from a server.

## Contact

Questions or concerns: use the support link on the extension's Chrome Web Store page.
