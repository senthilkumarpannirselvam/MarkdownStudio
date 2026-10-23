import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ext } from '@shared/browser';
import { loadSettings, saveSettings, type Settings } from '@shared/settings';

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  const patch = async (next: Partial<Settings>) => {
    try {
      setSettings(await saveSettings(next));
    } catch {
      /* Quota errors are reported on the options page. */
    }
  };

  if (!settings) return <p className="loading">Loading…</p>;

  return (
    <main className="pop">
      <h1>Markdown Studio</h1>
      <div className="row">
        <label htmlFor="theme">Theme</label>
        <select id="theme" value={settings.theme} onChange={(e) => patch({ theme: e.target.value as Settings['theme'] })}>
          <option value="auto">Match system</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div className="row">
        <label htmlFor="centered">Centered column</label>
        <input id="centered" type="checkbox" checked={settings.centered} onChange={(e) => patch({ centered: e.target.checked })} />
      </div>
      <div className="row">
        <label htmlFor="toc">Open contents by default</label>
        <input id="toc" type="checkbox" checked={settings.showToc} onChange={(e) => patch({ showToc: e.target.checked })} />
      </div>
      <div className="row">
        <label htmlFor="edit">Open files in edit mode</label>
        <input id="edit" type="checkbox" checked={settings.autoEdit} onChange={(e) => patch({ autoEdit: e.target.checked })} />
      </div>
      <button type="button" onClick={() => ext.runtime.openOptionsPage()}>All settings</button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
