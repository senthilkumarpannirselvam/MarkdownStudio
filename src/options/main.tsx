import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { diffChars } from 'diff';
import { blockHost, listBlocked, normalizeHost, unblockHost } from '@shared/blocklist';
import { clearDraft, getDraft, listDrafts } from '@shared/drafts';
import { loadSettings, MAX_CUSTOM_CSS, saveSettings, type Settings } from '@shared/settings';

type Draft = { url: string; updatedAt: number };

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [newHost, setNewHost] = useState('');
  const [diffUrl, setDiffUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadSettings().then(setSettings);
    void listDrafts().then(setDrafts);
    void listBlocked().then(setBlocked);
  }, []);

  async function patch(next: Partial<Settings>) {
    try {
      setSettings(await saveSettings(next));
      setError('');
    } catch {
      setError('Could not save settings. The browser rejected the write (storage quota).');
    }
  }

  async function discardDraft(url: string) {
    await clearDraft(url);
    setDrafts(await listDrafts());
    if (diffUrl === url) setDiffUrl(null);
  }

  async function addBlocked() {
    const host = normalizeHost(newHost);
    if (!host) return;
    await blockHost(host);
    setBlocked(await listBlocked());
    setNewHost('');
  }

  async function removeBlocked(host: string) {
    await unblockHost(host);
    setBlocked(await listBlocked());
  }

  if (!settings) return <p className="loading">Loading…</p>;

  return (
    <main className="opts">
      <header>
        <h1>Markdown Studio</h1>
        <p className="sub">Settings sync through your browser account where the browser supports it.</p>
        {error && <p className="error" role="alert">{error}</p>}
      </header>

      <section>
        <h2>Appearance</h2>
        <Select label="Theme" value={settings.theme} onChange={(theme) => patch({ theme })}
          options={[['auto', 'Match system'], ['light', 'Light'], ['dark', 'Dark']]} />
        <Select label="Font" value={settings.fontFamily} onChange={(fontFamily) => patch({ fontFamily })}
          options={[['system', 'System'], ['serif', 'Serif'], ['sans', 'Sans-serif'], ['mono', 'Monospace']]} />
        <div className="field">
          <label htmlFor="font-size">Font size: {settings.fontSize}px</label>
          <input id="font-size" type="range" min={12} max={22} value={settings.fontSize}
            onChange={(e) => patch({ fontSize: Number(e.target.value) })} />
        </div>
        <Select label="Page width" value={settings.pageWidth} onChange={(pageWidth) => patch({ pageWidth })}
          options={[['full', 'Fit to screen'], ['wide', 'Wide (about 120 characters)'], ['reading', 'Reading column (72 characters)']]} />
        <Check label="Wrap long lines in table cells (turn off to scroll tables sideways)" value={settings.wrapTables} onChange={(wrapTables) => patch({ wrapTables })} />
        <Check label="Wrap long lines in code blocks (turn off to scroll code sideways)" value={settings.wrapCode} onChange={(wrapCode) => patch({ wrapCode })} />
        <Check label="Open the table of contents by default" value={settings.showToc} onChange={(showToc) => patch({ showToc })} />
        <Check label="Show word count and reading time" value={settings.showReadingTime} onChange={(showReadingTime) => patch({ showReadingTime })} />
      </section>

      <section>
        <h2>Rendering</h2>
        <Check label="Callouts (> [!NOTE], [!WARNING], …)" value={settings.enableCallouts} onChange={(enableCallouts) => patch({ enableCallouts })} />
        <Check label="HTML inside Markdown (images with a size, details, kbd, centered text); scripts and styles are always removed" value={settings.allowHtml} onChange={(allowHtml) => patch({ allowHtml })} />
        <Check label="Footnotes" value={settings.enableFootnotes} onChange={(enableFootnotes) => patch({ enableFootnotes })} />
        <Check label="Emoji shortcodes (:tada:)" value={settings.enableEmoji} onChange={(enableEmoji) => patch({ enableEmoji })} />
        <Check label="Wiki links ([[Page]])" value={settings.enableWikilinks} onChange={(enableWikilinks) => patch({ enableWikilinks })} />
        <Check label="Show front matter as a collapsible card" value={settings.hideFrontmatter} onChange={(hideFrontmatter) => patch({ hideFrontmatter })} />
        <Check label="Copy button on code blocks" value={settings.showCopyButtons} onChange={(showCopyButtons) => patch({ showCopyButtons })} />
        <Check label="Fold sections by clicking the arrow beside a heading" value={settings.foldSections} onChange={(foldSections) => patch({ foldSections })} />
      </section>

      <section>
        <h2>Diagrams and math</h2>
        <Check label="Mermaid diagrams" value={settings.enableMermaid} onChange={(enableMermaid) => patch({ enableMermaid })} />
        <Check label="Math with KaTeX ($…$ and $$…$$)" value={settings.enableKatex} onChange={(enableKatex) => patch({ enableKatex })} />
        <Check label="Graphviz (```dot blocks)" value={settings.enableGraphviz} onChange={(enableGraphviz) => patch({ enableGraphviz })} />
        <Check label="PlantUML (sends diagram text to a server)" value={settings.enablePlantuml} onChange={(enablePlantuml) => patch({ enablePlantuml })} />
        <div className="field">
          <label htmlFor="plantuml-server">PlantUML server</label>
          <input id="plantuml-server" type="url" value={settings.plantumlServer} disabled={!settings.enablePlantuml}
            onChange={(e) => patch({ plantumlServer: e.target.value })} />
        </div>
        <p className="sub">
          PlantUML cannot run in the browser. When enabled, the text of each <code>plantuml</code> block is sent to this
          server to be drawn. Point it at your own server to keep diagrams private.
        </p>
      </section>

      <section>
        <h2>Editor</h2>
        <Check label="Open files in edit mode" value={settings.autoEdit} onChange={(autoEdit) => patch({ autoEdit })} />
        <Check label="Keep editor and preview scrolled together in split view" value={settings.scrollSync} onChange={(scrollSync) => patch({ scrollSync })} />
        <Check label="Show a minimap" value={settings.showMinimap} onChange={(showMinimap) => patch({ showMinimap })} />
        <div className="field">
          <label htmlFor="autosave">Autosave draft after (ms, 0 to turn off)</label>
          <input id="autosave" type="number" min={0} max={30000} step={500} value={settings.autosaveMs}
            onChange={(e) => patch({ autosaveMs: Number(e.target.value) })} />
        </div>
      </section>

      <section>
        <h2>Online files</h2>
        <Check label="Refresh when the file changes on the server" value={settings.pollRemote} onChange={(pollRemote) => patch({ pollRemote })} />
        <div className="field">
          <label htmlFor="poll">Check every (seconds)</label>
          <input id="poll" type="number" min={2} max={600} value={settings.pollSeconds}
            onChange={(e) => patch({ pollSeconds: Number(e.target.value) })} />
        </div>
      </section>

      <section>
        <h2>Custom CSS</h2>
        <p className="sub">Applied to every rendered page. Prefix rules with <code>.ms-prose</code> to style the document only. Limit {MAX_CUSTOM_CSS} characters.</p>
        <textarea className="css-editor" aria-label="Custom CSS" rows={8} spellCheck={false} maxLength={MAX_CUSTOM_CSS}
          value={settings.customCss} placeholder=".ms-prose { line-height: 1.8; }"
          onChange={(e) => patch({ customCss: e.target.value })} />
      </section>

      <section>
        <h2>Sites where Markdown Studio is off ({blocked.length})</h2>
        <div className="field">
          <label htmlFor="new-host">Add a site</label>
          <input id="new-host" type="text" value={newHost} placeholder="example.com"
            onChange={(e) => setNewHost(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBlocked()} />
          <button type="button" onClick={addBlocked}>Add</button>
        </div>
        {blocked.length > 0 && (
          <ul className="chips">
            {blocked.map((host) => (
              <li key={host}>
                {host} <button type="button" aria-label={`Remove ${host}`} onClick={() => removeBlocked(host)}>×</button>
              </li>
            ))}
          </ul>
        )}
        <p className="sub">Local files are listed as <code>local</code>.</p>
      </section>

      <section>
        <h2>Keyboard shortcuts</h2>
        <ul className="shortcuts">
          <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> light / dark theme</li>
          <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> fit to screen / reading width</li>
          <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> table of contents</li>
          <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> reload the original file</li>
          <li><kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd> view / edit (works on the page only)</li>
          <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>S</kbd> save</li>
          <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>B</kbd>, <kbd>I</kbd>, <kbd>K</kbd>, <kbd>E</kbd> bold, italic, link, code (in the editor)</li>
        </ul>
        <p className="sub">
          The first four can be changed at <code>chrome://extensions/shortcuts</code>.
        </p>
      </section>

      <section>
        <h2>Saved drafts ({drafts.length})</h2>
        {drafts.length === 0 ? (
          <p className="sub">Edits are kept here, per file, until you discard them.</p>
        ) : (
          <ul className="drafts">
            {drafts.map((d) => (
              <li key={d.url}>
                <span className="url" title={d.url}>{d.url}</span>
                <time>{new Date(d.updatedAt).toLocaleString()}</time>
                <button type="button" onClick={() => setDiffUrl(d.url)}>Compare</button>
                <button type="button" onClick={() => discardDraft(d.url)}>Discard</button>
              </li>
            ))}
          </ul>
        )}
        {diffUrl && <DraftDiff url={diffUrl} onClose={() => setDiffUrl(null)} />}
      </section>
    </main>
  );
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="field">
      <label>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}
      </label>
    </div>
  );
}

function Select<T extends string>(props: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  const id = `select-${props.label.toLowerCase()}`;
  return (
    <div className="field">
      <label htmlFor={id}>{props.label}</label>
      <select id={id} value={props.value} onChange={(e) => props.onChange(e.target.value as T)}>
        {props.options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </div>
  );
}

function DraftDiff({ url, onClose }: { url: string; onClose: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [live, setLive] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    void (async () => {
      setDraft(await getDraft(url));
      try {
        setLive(await (await fetch(url, { cache: 'no-store' })).text());
      } catch {
        setLive('');
        setNote('The live file could not be fetched (local files and sites that block cross-origin requests cannot be compared), so everything appears as added.');
      }
    })();
  }, [url]);

  const parts = useMemo(() => (draft === null || live === null ? [] : diffChars(live, draft)), [draft, live]);

  return (
    <div className="diff-wrap">
      <div className="diff-head">
        <strong>Draft compared with the live file</strong>
        <button type="button" onClick={onClose}>Close</button>
      </div>
      {note && <p className="sub diff-note">{note}</p>}
      <pre className="diff">
        {parts.map((p, i) => (
          <span key={i} className={p.added ? 'ins' : p.removed ? 'del' : undefined}>{p.value}</span>
        ))}
      </pre>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
