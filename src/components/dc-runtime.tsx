/* What is left of support.js.
 *
 * The old runtime was 71 KB that parsed the template with DOMParser on every
 * load, compiled it to React.createElement calls, and transpiled the app's
 * logic in the browser with a 3 MB copy of Babel. The compiler in tools/ does
 * the first two ahead of time and Next does the third, so all that remains are
 * the three behaviours the generated JSX still depends on — reproduced exactly,
 * because "roughly the same" here means a gap that closes up or an input that
 * goes uncontrolled on a screen nobody thought to re-check. */
import { Fragment, isValidElement, type ReactNode } from 'react';

/**
 * A `{{ … }}` hole in text.
 *
 * The wrapping <span> is not decoration: support.js:607 emitted one for every
 * interpolated value, and this layout is built out of flex rows with `gap`.
 * A span is a flex item and bare text is not, so removing it would silently
 * change spacing in every row that mixes a label with a value.
 *
 * undefined, null and booleans render nothing — the runtime's own rule, and
 * what keeps an absent figure blank rather than printing "undefined".
 */
export function interp(value: unknown): ReactNode {
  if (value === undefined || value === null || typeof value === 'boolean') return null;
  if (isValidElement(value) || Array.isArray(value)) return <Fragment>{value as ReactNode}</Fragment>;
  return <span className="sc-interp">{String(value)}</span>;
}

/**
 * A bound `style`, which renderVals hands back as a CSS string.
 *
 * Mirrors support.js:391 including its quirks: a declaration with no colon is
 * dropped, custom properties keep their `--name`, and everything else is
 * camel-cased for React. Values are left as strings — React only treats a
 * number as "add px", and nothing here relies on that.
 */
export function css(value: unknown): React.CSSProperties | undefined {
  if (value == null) return undefined;
  if (typeof value === 'object') return value as React.CSSProperties;
  const out: Record<string, string> = {};
  for (const decl of String(value).split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = decl.slice(i + 1).trim();
  }
  return out as React.CSSProperties;
}

/**
 * The list behind an `sc-for`.
 *
 * support.js:619 treats anything that is not an array as empty rather than
 * throwing, and the screens lean on it: every list on a page is null until its
 * fetch lands, and the page renders in that state first.
 */
export function asArray<T>(value: T[] | unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
