const findBalancedDivRanges = (html: string, tokenName: string): Array<{ start: number; end: number }> => {
  const ranges: Array<{ start: number; end: number }> = [];
  const openPattern = new RegExp(`<div\\b[^>]*\\bdata-crm-token="${tokenName}"[^>]*>`, 'gi');
  let match: RegExpExecArray | null = openPattern.exec(html);

  while (match) {
    const start = match.index;
    let depth = 1;
    let cursor = match.index + match[0].length;

    while (cursor < html.length && depth > 0) {
      const lower = html.toLowerCase();
      const nextOpen = lower.indexOf('<div', cursor);
      const nextClose = lower.indexOf('</div>', cursor);

      if (nextClose === -1) {
        cursor = html.length;
        break;
      }

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        cursor = nextOpen + 4;
        continue;
      }

      depth -= 1;
      cursor = nextClose + 6;
      if (depth === 0) {
        ranges.push({ start, end: cursor });
      }
    }

    match = openPattern.exec(html);
  }

  return ranges;
};

export const replaceEditorTokenBlocks = (html: string, tokenName: string, replacement: string): string => {
  const ranges = findBalancedDivRanges(html, tokenName);
  if (ranges.length === 0) {
    return html;
  }

  let result = html;
  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const { start, end } = ranges[index];
    result = `${result.slice(0, start)}${replacement}${result.slice(end)}`;
  }

  return result;
};

export const unwrapEditorTokenBlocks = (html: string, tokenName: string): string => {
  const ranges = findBalancedDivRanges(html, tokenName);
  if (ranges.length === 0) {
    return html;
  }

  let result = html;
  const openPattern = new RegExp(`^<div\\b[^>]*\\bdata-crm-token="${tokenName}"[^>]*>`, 'i');

  for (let index = ranges.length - 1; index >= 0; index -= 1) {
    const { start, end } = ranges[index];
    const openMatch = result.slice(start).match(openPattern);
    if (!openMatch) {
      continue;
    }
    const innerStart = start + openMatch[0].length;
    const innerHtml = result.slice(innerStart, end - 6);
    result = `${result.slice(0, start)}${innerHtml}${result.slice(end)}`;
  }

  return result;
};

export const collapseRepeatedToken = (html: string, token: string): string => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(\\s*${escaped}\\s*)+`, 'g'), `\n${token}\n`);
};
