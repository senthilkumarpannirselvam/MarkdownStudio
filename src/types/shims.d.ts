// Ambient types for packages that ship none.
declare module 'markdown-it-emoji' {
  import type MarkdownIt from 'markdown-it';
  export const full: (md: MarkdownIt, options?: unknown) => void;
}

declare module 'plantuml-encoder' {
  const plantumlEncoder: { encode(input: string): string };
  export default plantumlEncoder;
}

declare module '@hpcc-js/wasm/graphviz' {
  export const Graphviz: { load(): Promise<{ dot(source: string): string }> };
}

declare module '*?raw' {
  const text: string;
  export default text;
}
