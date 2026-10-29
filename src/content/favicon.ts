import iconSvg from '../../assets-src/icon.svg?raw';

/** Shows the Markdown Studio icon on the tab instead of the browser's generic page icon. */
export function installFavicon(): void {
  document.querySelectorAll('link[rel~="icon"]').forEach((link) => link.remove());
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = `data:image/svg+xml,${encodeURIComponent(iconSvg)}`;
  document.head.append(link);
}
