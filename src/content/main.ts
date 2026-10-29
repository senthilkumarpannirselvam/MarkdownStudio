import { blockHost, hostOf, isBlocked } from '@shared/blocklist';
import { clearDraft, getDraft, saveDraft } from '@shared/drafts';
import { ext, onStorageChange } from '@shared/browser';
import { loadSettings, saveSettings, SETTINGS_KEY } from '@shared/settings';
import { currentFilename, downloadFile } from './download';
import { enhancePreview, scrollToId, toggleTaskInSource, type FoldController } from './enhance';
import type { EditorHandle } from './editor';
import type { ExportFormat } from './exporters';
import { parseFrontmatter, renderFrontmatterCard } from './frontmatter';
import { renderDynamicBlocks } from './lazy';
import { initProblems } from './problems';
import { createMarkdown } from './markdown';
import { startPolling } from './poller';
import { initSplitter } from './splitter';
import { computeStats, formatStats } from './stats';
import { buildToc, type TocEntry } from './toc';
import type { ToolbarAction } from './toolbar';

type Mode = 'view' | 'edit' | 'split';

const TEXT_TYPES = /^text\/(plain|markdown|x-markdown|x-web-markdown)$/;
const MAX_SOURCE_CHARS = 3_000_000;

const ICON =
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
const icon = (body: string) => `<svg ${ICON}>${body}</svg>`;
const ICONS = {
  toc: icon('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>'),
  save: icon('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>'),
  moon: icon('<path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z"/>'),
  sun: icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'),
  expand: icon('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>'),
  collapse: icon('<path d="m7 4 5 5 5-5"/><path d="m7 20 5-5 5 5"/>'),
};

const FORMAT_BUTTONS: Array<[ToolbarAction, string, string]> = [
  ['bold', '<b>B</b>', 'Bold (Ctrl+B)'],
  ['italic', '<i>I</i>', 'Italic (Ctrl+I)'],
  ['strike', '<s>S</s>', 'Strikethrough'],
  ['code', '&lt;/&gt;', 'Inline code (Ctrl+E)'],
  ['link', 'Link', 'Link (Ctrl+K)'],
  ['image', 'Img', 'Image'],
  ['h2', 'H2', 'Heading'],
  ['quote', '&ldquo;', 'Quote'],
  ['ul', '&bull;', 'Bullet list'],
  ['ol', '1.', 'Numbered list'],
  ['task', '&#9744;', 'Task list'],
  ['codeblock', '{ }', 'Code block (Ctrl+Shift+C)'],
  ['table', 'Tbl', 'Insert table'],
  ['formatTable', 'Align', 'Align table columns'],
];

/** The raw-text viewer browsers show for plain text is a lone <pre>; anything else is a real web page. */
function rawTextPage(): HTMLPreElement | null {
  if (!TEXT_TYPES.test(document.contentType)) return null;
  const only = document.body?.children.length === 1 ? document.body.firstElementChild : null;
  return only instanceof HTMLPreElement ? only : null;
}

async function start(): Promise<void> {
  const pre = rawTextPage();
  if (!pre || (await isBlocked(location.href))) return;
  const original = pre.textContent ?? '';
  if (original.length > MAX_SOURCE_CHARS) return;

  let settings = await loadSettings();
  if (!settings.enabled) {
    onStorageChange(async (key) => {
      if (key !== SETTINGS_KEY) return;
      if ((await loadSettings()).enabled) location.reload();
    });
    return;
  }
  let md = createMarkdown(settings);

  let draft = await getDraft(location.href);
  if (draft === original) {
    void clearDraft(location.href);
    draft = null;
  }

  let source = draft ?? original;
  let mode: Mode = 'view';
  let unsaved = false;
  let editor: EditorHandle | undefined;
  let editorLoading: Promise<void> | undefined;
  let previewStale = false;
  let stopScrollSync: (() => void) | undefined;
  const timers: { render?: number; save?: number } = {};

  // Shell

  document.title = currentFilename('Markdown');
  document.body.replaceChildren();
  document.body.classList.add('ms-root');
  document.head.append(Object.assign(document.createElement('meta'), { name: 'darkreader-lock' }));

  const shell = document.createElement('div');
  shell.className = 'ms-shell';
  shell.innerHTML = `
    <header class="ms-toolbar">
      <div class="ms-toolbar-left" role="group" aria-label="Mode">
        <button type="button" data-mode="view">View</button>
        <button type="button" data-mode="edit">Edit</button>
        <button type="button" data-mode="split">Split</button>
      </div>
      <div class="ms-format-bar" role="toolbar" aria-label="Formatting" hidden>
        ${FORMAT_BUTTONS.map(([a, label, title]) => `<button type="button" data-fmt="${a}" title="${title}" aria-label="${title}">${label}</button>`).join('')}
      </div>
      <div class="ms-toolbar-right">
        <span class="ms-stats" data-role="stats"></span>
        <span class="ms-status" data-role="status" role="status"></span>
        <button type="button" class="ms-problems" data-role="problems" aria-expanded="false" hidden></button>
        <button type="button" class="ms-icon-btn" data-action="toggle-sections" title="Collapse all sections" aria-label="Collapse all sections" hidden>${ICONS.collapse}</button>
        <button type="button" class="ms-icon-btn" data-action="toc" title="Table of contents (Alt+Shift+B)" aria-label="Contents">${ICONS.toc}</button>
        <button type="button" class="ms-icon-btn" data-action="theme" title="Light / dark (Alt+Shift+T)" aria-label="Switch theme">${ICONS.moon}</button>
        <button type="button" class="ms-icon-btn" data-action="save" title="Save (Ctrl+S)" aria-label="Save">${ICONS.save}</button>
        <details class="ms-menu">
          <summary aria-label="More actions">&#8943;</summary>
          <div class="ms-menu-items">
            <button type="button" data-export="md">Export Markdown</button>
            <button type="button" data-export="html">Export HTML</button>
            <button type="button" data-export="docx">Export Word (.docx)</button>
            <button type="button" data-export="pdf">Print / save as PDF</button>
            <button type="button" data-action="discard">Discard draft and reload</button>
            <button type="button" data-action="block">Don't render on this site</button>
            <button type="button" data-action="options">Settings</button>
          </div>
        </details>
      </div>
    </header>
    <div class="ms-problems-panel" role="region" aria-label="Content that could not be shown" hidden></div>
    <aside class="ms-toc" aria-label="Table of contents"></aside>
    <main class="ms-main" data-ms-mode="view">
      <section class="ms-editor" aria-label="Editor" hidden></section>
      <div class="ms-divider" role="separator" aria-orientation="vertical" aria-label="Resize editor and preview (arrow keys, double-click to reset)" tabindex="0" hidden></div>
      <article class="ms-preview ms-prose" aria-label="Rendered Markdown"></article>
    </main>`;
  document.body.append(shell);

  const $ = <T extends HTMLElement>(selector: string) => shell.querySelector<T>(selector)!;
  const main = $('.ms-main');
  const preview = $('.ms-preview');
  const editorHost = $('.ms-editor');
  const formatBar = $('.ms-format-bar');
  const tocPanel = $('.ms-toc');
  const statsEl = $('[data-role="stats"]');
  const statusEl = $('[data-role="status"]');
  const menu = $<HTMLDetailsElement>('.ms-menu');
  const divider = $('.ms-divider');
  await initSplitter(main, divider);
  const problems = initProblems($('[data-role="problems"]'), $('.ms-problems-panel'), preview);

  let folds: FoldController = { count: 0, allFolded: () => false, expandAll() {}, collapseAll() {}, toggleAll() {} };
  const syncFoldButton = () => {
    const button = shell.querySelector<HTMLButtonElement>('[data-action="toggle-sections"]');
    if (!button) return;
    button.hidden = folds.count < 2;
    const expand = folds.allFolded();
    button.innerHTML = expand ? ICONS.expand : ICONS.collapse;
    const label = expand ? 'Expand all sections' : 'Collapse all sections';
    button.title = label;
    button.setAttribute('aria-label', label);
  };

  const setStatus = (text: string) => void (statusEl.textContent = text);
  const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Appearance

  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const resolveTheme = () => (settings.theme === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : settings.theme);

  function applyAppearance(): void {
    const root = document.documentElement;
    root.dataset.msTheme = resolveTheme();
    root.dataset.msFont = settings.fontFamily;
    root.style.setProperty('--ms-font-size', `${settings.fontSize}px`);
    root.dataset.msWidth = settings.pageWidth;
    root.classList.toggle('ms-wrap-tables', settings.wrapTables);
    root.classList.toggle('ms-wrap-code', settings.wrapCode);

    const themeButton = shell.querySelector<HTMLButtonElement>('[data-action="theme"]');
    if (themeButton) {
      const dark = resolveTheme() === 'dark';
      themeButton.innerHTML = dark ? ICONS.sun : ICONS.moon;
      themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }

    let style = document.getElementById('ms-user-css');
    if (settings.customCss) {
      style ??= Object.assign(document.createElement('style'), { id: 'ms-user-css' });
      style.textContent = settings.customCss;
      document.head.append(style);
    } else {
      style?.remove();
    }
  }
  darkQuery.addEventListener('change', () => {
    if (settings.theme === 'auto') {
      applyAppearance();
      renderPreview();
    }
  });

  // Rendering

  function renderToc(entries: TocEntry[]): void {
    const list = document.createElement('ul');
    for (const entry of entries) {
      const item = document.createElement('li');
      item.className = `ms-toc-l${entry.level}`;
      const link = document.createElement('a');
      link.href = `#${encodeURIComponent(entry.id)}`;
      link.textContent = entry.text;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        scrollToId(entry.id);
      });
      item.append(link);
      list.append(item);
    }
    tocPanel.replaceChildren(
      entries.length ? list : Object.assign(document.createElement('p'), { textContent: 'No headings.' }),
    );
  }

  function updateStats(): void {
    statsEl.textContent = settings.showReadingTime ? formatStats(computeStats(source)) : '';
  }

  function renderPreview(): void {
    const { data, body, lineOffset } = settings.hideFrontmatter
      ? parseFrontmatter(source)
      : { data: {}, body: source, lineOffset: 0 };
    const scroll = preview.scrollTop;

    preview.innerHTML = renderFrontmatterCard(data) + md.render(body, {});
    renderToc(buildToc(preview));
    problems.scan(preview);
    folds = enhancePreview(preview, {
      settings,
      baseUrl: location.href,
      lineOffset,
      onTaskToggle(line, checked) {
        source = toggleTaskInSource(source, line, checked);
        editor?.setValue(source);
        markEdited();
      },
      onSectionOpen(body) {
        void renderDynamicBlocks(body, settings);
      },
      onFoldChange: syncFoldButton,
    });
    syncFoldButton();
    problems.refresh();
    void renderDynamicBlocks(preview, settings);

    preview.scrollTop = scroll;
    previewStale = false;
  }

  /** Re-renders the preview and statistics shortly after the last change. */
  function scheduleRefresh(): void {
    window.clearTimeout(timers.render);
    timers.render = window.setTimeout(() => {
      updateStats();
      if (mode === 'edit') previewStale = true;
      else renderPreview();
    }, 200);
  }

  // Saving

  function markEdited(): void {
    unsaved = true;
    setStatus('Unsaved changes');
    scheduleRefresh();
    if (!settings.autosaveMs) return;
    window.clearTimeout(timers.save);
    timers.save = window.setTimeout(() => void saveDraftNow(), settings.autosaveMs);
  }

  async function saveDraftNow(): Promise<boolean> {
    try {
      await saveDraft(location.href, source);
      unsaved = false;
      setStatus(`Draft saved ${clock()}`);
      return true;
    } catch {
      setStatus('Could not save: extension storage is full');
      return false;
    }
  }

  async function save(): Promise<void> {
    if (location.protocol === 'file:') {
      downloadFile(currentFilename(), source, 'text/markdown');
      if (await saveDraftNow()) setStatus('Downloaded. Replace the original file with it to keep your changes.');
    } else {
      await saveDraftNow();
    }
  }

  // Modes and editor

  function ensureEditor(): Promise<void> {
    editorLoading ??= (async () => {
      const [{ mountEditor }, { wireImagePaste }] = await Promise.all([import('./editor'), import('./paste')]);
      editor = mountEditor(
        editorHost,
        source,
        (text) => {
          source = text;
          markEdited();
        },
        { minimap: settings.showMinimap },
      );
      wireImagePaste(editorHost, editor.view, setStatus);
    })();
    return editorLoading;
  }

  async function setMode(next: Mode): Promise<void> {
    const leaving = mode === 'view' ? preview.scrollTop : (editor?.getScrollTop() ?? 0);
    mode = next;
    main.dataset.msMode = next;
    formatBar.hidden = next === 'view';
    divider.hidden = next !== 'split';
    document.documentElement.classList.toggle('ms-panes', next !== 'view');
    shell
      .querySelectorAll<HTMLButtonElement>('[data-mode]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === next)));

    stopScrollSync?.();
    stopScrollSync = undefined;

    if (next !== 'view') await ensureEditor();
    editorHost.hidden = next === 'view';
    preview.hidden = next === 'edit';

    if (next !== 'edit' && (previewStale || preview.childElementCount === 0)) renderPreview();
    if (next === 'view') {
      preview.scrollTop = leaving;
    } else {
      editor?.setScrollTop(leaving);
      editor?.view.focus();
    }
    if (next === 'split' && editor && settings.scrollSync) {
      const { wireScrollSync } = await import('./scrollsync');
      stopScrollSync = wireScrollSync(editor.view, preview);
    }
  }

  // Events

  shell
    .querySelectorAll<HTMLButtonElement>('[data-mode]')
    .forEach((b) => b.addEventListener('click', () => void setMode(b.dataset.mode as Mode)));
  shell.querySelectorAll<HTMLButtonElement>('[data-fmt]').forEach((b) =>
    b.addEventListener('click', async () => {
      const { runToolbar } = await import('./toolbar');
      if (editor) runToolbar(editor.view, b.dataset.fmt as ToolbarAction);
    }),
  );

  const toggleToc = () => void document.documentElement.classList.toggle('ms-toc-visible');
  const toggleTheme = () => {
    settings = { ...settings, theme: resolveTheme() === 'dark' ? 'light' : 'dark' };
    applyAppearance();
    renderPreview();
    void saveSettings({ theme: settings.theme }).catch(() => {});
  };
  const toggleWidth = () => {
    settings = { ...settings, pageWidth: settings.pageWidth === 'reading' ? 'full' : 'reading' };
    applyAppearance();
    void saveSettings({ pageWidth: settings.pageWidth }).catch(() => {});
  };
  const reload = async () => {
    if ((unsaved || draft !== null) && !confirm('Discard your edits and reload the original file?')) return;
    window.clearTimeout(timers.save);
    unsaved = false;
    await clearDraft(location.href);
    location.reload();
  };

  const actions: Record<string, () => void | Promise<void>> = {
    toc: toggleToc,
    theme: toggleTheme,
    save,
    'toggle-sections': () => folds.toggleAll(),
    discard: reload,
    options: () => void ext.runtime.sendMessage({ type: 'openOptions' }),
    block: async () => {
      await blockHost(hostOf(location.href));
      setStatus(`Disabled on ${hostOf(location.href)}. Reload to see the raw file.`);
    },
  };
  shell.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((b) =>
    b.addEventListener('click', () => {
      menu.open = false;
      void actions[b.dataset.action!]?.();
    }),
  );
  shell.querySelectorAll<HTMLButtonElement>('[data-export]').forEach((b) =>
    b.addEventListener('click', async () => {
      menu.open = false;
      const { exportAs } = await import('./exporters');
      if (previewStale || mode === 'edit') renderPreview();
      await exportAs(b.dataset.export as ExportFormat, source, preview, currentFilename());
    }),
  );
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target as Node)) menu.open = false;
  });

  ext.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== ext.runtime.id || message?.type !== 'command') return;
    const commands: Record<string, () => void | Promise<void>> = {
      togglePageTheme: toggleTheme,
      toggleCentered: toggleWidth,
      toggleSide: toggleToc,
      toggleRefresh: reload,
    };
    void commands[message.command]?.();
  });

  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.altKey && e.shiftKey && e.code === 'KeyE') {
      e.preventDefault();
      void setMode(mode === 'view' ? 'edit' : 'view');
    } else if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's' && (mode !== 'view' || unsaved)) {
      e.preventDefault();
      void save();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (unsaved) e.preventDefault();
  });

  onStorageChange(async (key) => {
    if (key !== SETTINGS_KEY) return;
    const next = await loadSettings();
    if (!next.enabled) {
      location.reload();
      return;
    }
    settings = next;
    md = createMarkdown(settings);
    applyAppearance();
    updateStats();
    renderPreview();
  });

  if (settings.pollRemote) {
    startPolling(location.href, settings.pollSeconds, async () => {
      if (unsaved) return setStatus('The file changed on the server');
      try {
        source = await (await fetch(location.href, { cache: 'no-store' })).text();
        editor?.setValue(source);
        renderPreview();
        updateStats();
      } catch {
        setStatus('Could not refresh the file');
      }
    });
  }

  // Initial paint

  applyAppearance();
  updateStats();
  renderPreview();
  if (settings.showToc) toggleToc();
  if (draft !== null) setStatus('Restored your saved draft');
  await setMode(settings.autoEdit ? 'edit' : 'view');
}

void start();
