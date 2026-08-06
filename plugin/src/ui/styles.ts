/**
 * UI styles as a plain string, injected once at mount. Uses Figma theme CSS
 * variables so contrast and dark/light mode come for free. Focus states are
 * always visible and status is never conveyed by color alone.
 */
export const styles = `
:root {
  --hl-gap: 12px;
  --hl-radius: 6px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, "SF Pro Text", system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.45;
  color: var(--figma-color-text, #1a1a1a);
  background: var(--figma-color-bg, #fff);
}
#root { height: 100vh; display: flex; flex-direction: column; }
.hl-app { display: flex; flex-direction: column; height: 100%; }
.hl-scroll { flex: 1 1 auto; overflow-y: auto; padding: var(--hl-gap); }
.hl-footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--figma-color-border, #e5e5e5);
  padding: var(--hl-gap);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
h1 { font-size: 13px; margin: 0 0 2px; }
h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; margin: 16px 0 8px; }
p { margin: 0 0 8px; }
.hl-muted { color: var(--figma-color-text-secondary, #666); }
.hl-card {
  border: 1px solid var(--figma-color-border, #e5e5e5);
  border-radius: var(--hl-radius);
  padding: 10px;
  margin-bottom: 8px;
  background: var(--figma-color-bg, #fff);
}
.hl-overview { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin-bottom: 12px; }
.hl-overview dt { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.6; }
.hl-overview dd { margin: 0 0 4px; font-weight: 600; }
button {
  font: inherit;
  border-radius: var(--hl-radius);
  border: 1px solid var(--figma-color-border, #ccc);
  padding: 8px 12px;
  cursor: pointer;
  background: var(--figma-color-bg, #fff);
  color: var(--figma-color-text, #1a1a1a);
}
button:hover { background: var(--figma-color-bg-hover, #f5f5f5); }
button:focus-visible { outline: 2px solid var(--figma-color-border-selected, #0d99ff); outline-offset: 1px; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button.hl-primary {
  background: var(--figma-color-bg-brand, #005a9e);
  color: var(--figma-color-text-onbrand, #fff);
  border-color: transparent;
}
button.hl-primary:hover { background: var(--figma-color-bg-brand-hover, #00457a); }
.hl-empty { text-align: center; padding: 32px 16px; }
.hl-change {
  border: 1px solid var(--figma-color-border, #e5e5e5);
  border-left-width: 3px;
  border-radius: var(--hl-radius);
  padding: 8px 10px;
  margin-bottom: 6px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.hl-change--added { border-left-color: #14ae5c; }
.hl-change--removed { border-left-color: #e03e1a; }
.hl-change--modified { border-left-color: #0d99ff; }
.hl-change__body { flex: 1 1 auto; min-width: 0; }
.hl-change__title { display: flex; align-items: center; gap: 6px; font-weight: 600; }
.hl-kind {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid currentColor;
}
.hl-diff { font-family: "SF Mono", ui-monospace, monospace; font-size: 11px; word-break: break-word; }
.hl-diff del { text-decoration: line-through; opacity: 0.6; }
.hl-diff ins { text-decoration: none; }
.hl-cat { font-size: 10px; opacity: 0.6; }
.hl-impact { font-size: 10px; font-weight: 600; white-space: nowrap; }
.hl-impact--low { color: #6b7280; }
.hl-impact--medium { color: #b45309; }
.hl-impact--high { color: #c2410c; }
.hl-impact--breaking { color: #b91c1c; }
.hl-toggle { display: flex; align-items: center; gap: 4px; font-size: 11px; white-space: nowrap; }
.hl-banner {
  border-radius: var(--hl-radius);
  padding: 8px 10px;
  margin-bottom: 10px;
  border: 1px solid var(--figma-color-border-danger, #e03e1a);
  color: var(--figma-color-text-danger, #b91c1c);
  background: var(--figma-color-bg-danger-tertiary, #fff5f5);
}
.hl-count { font-variant-numeric: tabular-nums; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.hl-progress { margin: 16px 0; }
.hl-progress__track { height: 6px; background: var(--figma-color-bg-secondary, #eee); border-radius: 3px; overflow: hidden; }
.hl-progress__fill { height: 100%; background: var(--figma-color-bg-brand, #0d99ff); transition: width .2s ease; }
.hl-toolbar { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.hl-filters { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.hl-chip { border: 1px solid var(--figma-color-border, #ccc); border-radius: 999px; padding: 2px 8px; font-size: 11px; cursor: pointer; background: transparent; color: inherit; }
.hl-chip[aria-pressed="true"] { background: var(--figma-color-bg-brand, #005a9e); color: var(--figma-color-text-onbrand, #fff); border-color: transparent; }
.hl-search { width: 100%; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--figma-color-border, #ccc); background: var(--figma-color-bg, #fff); color: inherit; }
.hl-bulk { display: flex; gap: 6px; }
.hl-link { background: none; border: none; padding: 0 2px; color: var(--figma-color-text-brand, #005a9e); cursor: pointer; font-size: 11px; text-decoration: underline; }
.hl-dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; padding: 20px; }
.hl-dialog { background: var(--figma-color-bg, #fff); border: 1px solid var(--figma-color-border, #ddd); border-radius: 8px; padding: 16px; max-width: 300px; }
.hl-dialog__actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
@media (prefers-reduced-motion: reduce) { .hl-progress__fill { transition: none; } }
`;
