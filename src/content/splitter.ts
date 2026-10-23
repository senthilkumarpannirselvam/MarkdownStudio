import { getLocal, setLocal } from '@shared/browser';

const KEY = 'splitPct.v1';
const MIN = 15;
const MAX = 85;
const DEFAULT = 50;
const KEY_STEP = 2;

export const clampSplit = (pct: number): number =>
  Number.isFinite(pct) ? Math.min(MAX, Math.max(MIN, pct)) : DEFAULT;

/**
 * Makes `divider` drag-resizable between the editor and preview columns of `main`.
 * The editor's share (in percent) is remembered on this device.
 */
export async function initSplitter(main: HTMLElement, divider: HTMLElement): Promise<void> {
  let pct = clampSplit(await getLocal<number>(KEY, DEFAULT));

  const apply = (value: number) => {
    pct = clampSplit(value);
    main.style.setProperty('--ms-split-a', `${pct}fr`);
    main.style.setProperty('--ms-split-b', `${100 - pct}fr`);
    divider.setAttribute('aria-valuenow', String(Math.round(pct)));
  };
  const persist = () => void setLocal(KEY, pct).catch(() => {});
  const finish = (e: PointerEvent) => {
    if (divider.hasPointerCapture(e.pointerId)) divider.releasePointerCapture(e.pointerId);
    divider.classList.remove('ms-dragging');
    document.body.classList.remove('ms-resizing');
    persist();
  };

  divider.setAttribute('aria-valuemin', String(MIN));
  divider.setAttribute('aria-valuemax', String(MAX));
  apply(pct);

  divider.addEventListener('pointerdown', (e) => {
    divider.setPointerCapture(e.pointerId);
    divider.classList.add('ms-dragging');
    document.body.classList.add('ms-resizing');
  });
  divider.addEventListener('pointermove', (e) => {
    if (!divider.hasPointerCapture(e.pointerId)) return;
    const box = main.getBoundingClientRect();
    apply(((e.clientX - box.left) / box.width) * 100);
  });
  divider.addEventListener('pointerup', finish);
  divider.addEventListener('pointercancel', finish);
  divider.addEventListener('dblclick', () => {
    apply(DEFAULT);
    persist();
  });
  divider.addEventListener('keydown', (e) => {
    const next = { ArrowLeft: pct - KEY_STEP, ArrowRight: pct + KEY_STEP, Home: DEFAULT }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    apply(next);
    persist();
  });
}
