import { ext } from '@shared/browser';

// Keyboard commands are only delivered to the background; forward them to the active tab.
ext.commands.onCommand.addListener((command) => {
  ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const id = tabs[0]?.id;
    if (id === undefined) return;
    ext.tabs.sendMessage(id, { type: 'command', command }, () => void ext.runtime.lastError);
  });
});

// Content scripts cannot open the options page themselves.
ext.runtime.onMessage.addListener((message, sender) => {
  if (sender.id === ext.runtime.id && message?.type === 'openOptions') ext.runtime.openOptionsPage();
});
