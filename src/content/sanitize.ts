import DOMPurify from 'dompurify';

// Raw HTML in Markdown (an <img> with a width, <details>, <kbd>, centered badges) is common, so it is rendered after
// being filtered through this allow-list. Scripts, forms, frames, inline event handlers and arbitrary styles never get
// through. The list also has to cover the markup this extension generates itself.
const TAGS = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details',
  'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'input', 'ins',
  'kbd', 'li', 'mark', 'ol', 'p', 'picture', 'pre', 'q', 's', 'samp', 'section', 'small', 'span', 'strong', 'sub',
  'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'tt', 'u', 'ul', 'var', 'wbr',
];

const ATTRS = [
  'align', 'alt', 'checked', 'class', 'colspan', 'data-kind', 'data-line', 'dir', 'disabled', 'height', 'href', 'id',
  'lang', 'open', 'rowspan', 'src', 'start', 'style', 'title', 'type', 'valign', 'width',
];

// Web, mail and relative addresses. A Windows drive path (C:\pics\a.png) is also allowed; it is resolved against the
// page later and simply fails to load on a web page.
const URL_PATTERN = (allowFile: boolean) =>
  new RegExp(
    `^(?:(?:https?|mailto|tel${allowFile ? '|file' : ''}):|[^a-z]|[a-z]:(?:[\\\\/]|%5c)|[a-z+.\\-]+(?:[^a-z+.\\-:]|$))`,
    'i',
  );

// Table alignment is the only inline style we produce or accept.
const TEXT_ALIGN = /^\s*text-align:\s*(left|right|center)\s*;?\s*$/i;

let hooked = false;
function installHooks(): void {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'style' && !(/^(TH|TD)$/.test(node.nodeName) && TEXT_ALIGN.test(data.attrValue))) {
      data.keepAttr = false;
    }
  });
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'INPUT' && node.getAttribute('type') !== 'checkbox') node.remove();
  });
}

/** Filters rendered Markdown. `allowFile` lets links and images use file:// addresses (only on local-file pages). */
export function sanitizeHtml(html: string, allowFile = false): string {
  installHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TAGS,
    ALLOWED_ATTR: ATTRS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOWED_URI_REGEXP: URL_PATTERN(allowFile),
    // The page is a bare document and no script of ours looks elements up by name, so heading ids such as
    // "location" must survive for the contents panel.
    SANITIZE_DOM: false,
    SANITIZE_NAMED_PROPS: false,
  });
}
