import { escapeHtml } from '@shared/html';
import { downloadFile } from './download';

export type ExportFormat = 'md' | 'html' | 'pdf' | 'docx';

const baseName = (filename: string) => filename.replace(/\.[^.]+$/, '') || 'document';

export async function exportAs(format: ExportFormat, source: string, preview: HTMLElement, filename: string): Promise<void> {
  switch (format) {
    case 'md':
      return downloadFile(`${baseName(filename)}.md`, source, 'text/markdown');
    case 'html':
      return downloadFile(`${baseName(filename)}.html`, standaloneHtml(preview, filename), 'text/html');
    case 'pdf':
      window.print();
      return;
    case 'docx':
      return exportDocx(preview, filename);
  }
}

/** Rendered content with the interactive chrome (copy buttons, fold toggles) removed. */
function cleanClone(preview: HTMLElement): HTMLElement {
  const clone = preview.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.ms-copy, .ms-fold-toggle').forEach((el) => el.remove());
  clone.querySelectorAll<HTMLElement>('[hidden]').forEach((el) => el.removeAttribute('hidden'));
  return clone;
}

function standaloneHtml(preview: HTMLElement, filename: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data:; style-src 'unsafe-inline'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(filename)}</title>
<style>
body { font: 16px/1.6 system-ui, sans-serif; max-width: 72ch; margin: 2em auto; padding: 0 1em; color: #1f1f1f; overflow-wrap: anywhere; }
pre, code { font-family: ui-monospace, Menlo, Consolas, monospace; }
pre { background: #f3f1ee; padding: 12px 16px; border-radius: 6px; overflow-x: auto; }
code { background: #f3f1ee; padding: 1px 5px; border-radius: 3px; }
pre code { padding: 0; background: none; }
.ms-table-wrap { overflow-x: auto; }
table { border-collapse: collapse; }
th, td { padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: left; }
blockquote { margin-left: 0; padding: 0.4em 1em; color: #555; border-left: 3px solid #ddd; }
img, svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
${cleanClone(preview).innerHTML}
</body>
</html>`;
}

async function exportDocx(preview: HTMLElement, filename: string): Promise<void> {
  const docx = await import('docx');
  const { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ExternalHyperlink } = docx;
  type Child = InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink>;
  type Block = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;

  const MONO = 'Consolas';
  const HEADINGS = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];

  interface Style {
    bold?: boolean;
    italics?: boolean;
    strike?: boolean;
    font?: string;
  }

  const inline = (node: Node, style: Style = {}): Child[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue ?? '';
      return text ? [new TextRun({ text, ...style })] : [];
    }
    if (!(node instanceof HTMLElement) || node.matches('.ms-copy, .ms-fold-toggle, .ms-callout-icon, script, style')) {
      return [];
    }
    const tag = node.tagName;
    if (tag === 'BR') return [new TextRun({ break: 1 })];
    if (tag === 'INPUT') return [new TextRun((node as HTMLInputElement).checked ? '☑ ' : '☐ ')];
    const next: Style = { ...style };
    if (tag === 'STRONG' || tag === 'B') next.bold = true;
    if (tag === 'EM' || tag === 'I') next.italics = true;
    if (tag === 'DEL' || tag === 'S') next.strike = true;
    if (tag === 'CODE') next.font = MONO;
    const children = [...node.childNodes].flatMap((c) => inline(c, next));
    const href = tag === 'A' ? node.getAttribute('href') : null;
    if (href && /^https?:/i.test(href)) return [new ExternalHyperlink({ link: href, children: children as InstanceType<typeof TextRun>[] })];
    return children;
  };

  const inlineOf = (el: Element) => [...el.childNodes].flatMap((c) => inline(c));

  const list = (el: Element, level: number): Block[] => {
    const ordered = el.tagName === 'OL';
    const out: Block[] = [];
    [...el.children].forEach((li, index) => {
      if (li.tagName !== 'LI') return;
      const own = [...li.childNodes].filter((n) => !(n instanceof HTMLElement && /^(UL|OL)$/.test(n.tagName)));
      const prefix = ordered ? [new TextRun(`${index + 1}. `)] : [];
      out.push(
        new Paragraph({
          children: [...prefix, ...own.flatMap((n) => inline(n))],
          ...(ordered ? { indent: { left: 360 * (level + 1) } } : { bullet: { level } }),
        }),
      );
      li.querySelectorAll(':scope > ul, :scope > ol').forEach((nested) => out.push(...list(nested, level + 1)));
    });
    return out;
  };

  const blocks = (parent: Element, indent = 0): Block[] =>
    [...parent.children].flatMap((el): Block[] => {
      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag)) {
        return [new Paragraph({ heading: HEADINGS[Number(tag[1]) - 1], children: inlineOf(el) })];
      }
      if (tag === 'P') return [new Paragraph({ children: inlineOf(el), indent: { left: indent } })];
      if (tag === 'UL' || tag === 'OL') return list(el, 0);
      if (tag === 'BLOCKQUOTE') return blocks(el, indent + 720);
      if (tag === 'PRE') {
        return (el.querySelector('code')?.textContent ?? '')
          .replace(/\n$/, '')
          .split('\n')
          .map((line) => new Paragraph({ children: [new TextRun({ text: line, font: MONO })], indent: { left: indent } }));
      }
      if (tag === 'TABLE' || el.classList.contains('ms-table-wrap')) {
        const table = tag === 'TABLE' ? el : el.querySelector('table');
        if (!table) return [];
        const rows = [...table.querySelectorAll('tr')].map(
          (tr) =>
            new TableRow({
              children: [...tr.children].map(
                (cell) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [...cell.childNodes].flatMap((n) => inline(n, cell.tagName === 'TH' ? { bold: true } : {})),
                      }),
                    ],
                  }),
              ),
            }),
        );
        return rows.length ? [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })] : [];
      }
      if (tag === 'DIV' || tag === 'SECTION' || tag === 'DETAILS' || tag === 'DL') return blocks(el, indent);
      return [];
    });

  const content = cleanClone(preview);
  content.querySelectorAll('details.ms-frontmatter').forEach((el) => el.remove());
  const document_ = new docx.Document({ sections: [{ children: blocks(content) }] });
  downloadFile(`${baseName(filename)}.docx`, await docx.Packer.toBlob(document_), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
