// The strict Markdown subset the estate ADRs are written in. Anything outside
// it throws with file and line, so a new construct fails the build instead of
// reaching the page half-rendered.

export class MarkdownError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MarkdownError';
  }
}

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MARKER = /^( *)(-|\d+\.) (.*)$/;

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[`*]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Index of the next unescaped `delimiter` from `start`, skipping code spans.
function findClosing(text, start, delimiter) {
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    if (text.startsWith(delimiter, i)) {
      if (delimiter === '*' && (text[i + 1] === '*' || text[i - 1] === '*')) continue;
      return i;
    }
  }
  return -1;
}

function renderInline(text, context) {
  const fail = (what) => {
    throw new MarkdownError(`${context.file}:${context.line}: ${what} is outside the supported Markdown subset`);
  };
  let out = '';
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '`') {
      const end = text.indexOf('`', i + 1);
      if (end < 0) fail('an unclosed code span');
      out += `<code>${escapeHtml(text.slice(i + 1, end))}</code>`;
      i = end + 1;
    } else if (char === '!' && text[i + 1] === '[') {
      fail('an image');
    } else if (char === '[') {
      const close = findClosing(text, i + 1, ']');
      const target = close >= 0 && text[close + 1] === '(' ? text.indexOf(')', close + 2) : -1;
      if (target < 0) {
        out += '[';
        i += 1;
        continue;
      }
      const href = context.rewriteLink(text.slice(close + 2, target), context);
      out += `<a href="${escapeHtml(href)}">${renderInline(text.slice(i + 1, close), context)}</a>`;
      i = target + 1;
    } else if (char === '*') {
      const delimiter = text[i + 1] === '*' ? '**' : '*';
      const close = findClosing(text, i + delimiter.length, delimiter);
      if (close < 0) {
        out += escapeHtml(delimiter);
        i += delimiter.length;
        continue;
      }
      const tag = delimiter === '**' ? 'strong' : 'em';
      out += `<${tag}>${renderInline(text.slice(i + delimiter.length, close), context)}</${tag}>`;
      i = close + delimiter.length;
    } else if (char === '<') {
      fail('raw HTML');
    } else {
      out += escapeHtml(char);
      i += 1;
    }
  }
  return out;
}

function parseBlocks(source, file, firstLine) {
  const lines = source.split('\n');
  const blocks = [];
  let paragraph = null;
  let list = null;
  let blankBefore = false;

  const fail = (offset, what) => {
    throw new MarkdownError(`${file}:${firstLine + offset}: ${what} is outside the supported Markdown subset`);
  };

  lines.forEach((raw, offset) => {
    const line = raw.replace(/\s+$/, '');
    const lineNumber = firstLine + offset;

    if (line === '') {
      paragraph = null;
      blankBefore = true;
      return;
    }
    const wasBlank = blankBefore;
    blankBefore = false;

    if (/^\s*(```|~~~)/.test(line)) fail(offset, 'a fenced block');
    if (/^\s*\|/.test(line)) fail(offset, 'a table');
    if (/^\s*>/.test(line)) fail(offset, 'a block quote');
    if (/^\s*</.test(line)) fail(offset, 'raw HTML');
    if (/^\s*!\[/.test(line)) fail(offset, 'an image');
    if (/^ {0,3}(-{3,}|\*{3,}|_{3,}|={3,})$/.test(line)) fail(offset, 'a rule or setext heading');

    const heading = line.match(/^(#+) (.+)$/);
    if (heading) {
      if (heading[1].length < 2 || heading[1].length > 3) fail(offset, `a level-${heading[1].length} heading`);
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2], line: lineNumber });
      paragraph = null;
      list = null;
      return;
    }

    const marker = line.match(MARKER);
    if (marker) {
      const [, indent, symbol, text] = marker;
      const ordered = symbol !== '-';
      const item = { text: [text], line: lineNumber, children: null };
      if (indent.length === 0) {
        if (!list || list.ordered !== ordered) {
          list = { type: 'list', ordered, start: ordered ? Number.parseInt(symbol, 10) : 1, items: [], line: lineNumber };
          blocks.push(list);
        }
        list.items.push(item);
        list.current = item;
        list.nestedIndent = null;
        paragraph = null;
        return;
      }
      if (!list) fail(offset, 'an indented list');
      if (list.nestedIndent !== null && indent.length > list.nestedIndent) fail(offset, 'a list nested two levels deep');
      const parent = list.current;
      if (!parent.children || parent.children.ordered !== ordered) {
        if (parent.children) fail(offset, 'a nested list of a second type');
        parent.children = { ordered, start: ordered ? Number.parseInt(symbol, 10) : 1, items: [] };
      }
      parent.children.items.push(item);
      list.nestedIndent = indent.length;
      return;
    }

    if (list && !paragraph) {
      if (wasBlank) {
        if (/^ /.test(line)) fail(offset, 'an indented block after a blank line');
        list = null;
      } else {
        const nested = list.current.children;
        const indent = line.match(/^ */)[0].length;
        if (nested && list.nestedIndent !== null) {
          if (indent <= list.nestedIndent) fail(offset, 'text after a nested list');
          nested.items[nested.items.length - 1].text.push(line.trim());
        } else {
          list.current.text.push(line.trim());
        }
        return;
      }
    }

    if (/^ {4}/.test(line) && !paragraph) fail(offset, 'an indented code block');
    if (paragraph) {
      paragraph.text.push(line.trim());
    } else {
      paragraph = { type: 'paragraph', text: [line.trim()], line: lineNumber };
      blocks.push(paragraph);
    }
  });

  return blocks;
}

function renderList(list, context) {
  const tag = list.ordered ? 'ol' : 'ul';
  const start = list.ordered ? ` start="${list.start}"` : '';
  const items = list.items.map((item) => {
    const inner = renderInline(item.text.join(' '), { ...context, line: item.line });
    const children = item.children ? renderList(item.children, context) : '';
    return `<li>${inner}${children}</li>`;
  });
  return `<${tag}${start}>${items.join('')}</${tag}>`;
}

function defaultRewriteLink(href, context) {
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  throw new MarkdownError(`${context.file}:${context.line}: relative link "${href}" has no published target`);
}

export function renderMarkdown(source, { file = 'markdown', firstLine = 1, rewriteLink = defaultRewriteLink } = {}) {
  const context = { file, rewriteLink };
  const ids = new Map();
  return parseBlocks(source, file, firstLine)
    .map((block) => {
      if (block.type === 'heading') {
        let id = slug(block.text);
        const seen = ids.get(id) || 0;
        ids.set(id, seen + 1);
        if (seen) id = `${id}-${seen + 1}`;
        return `<h${block.level} id="${id}">${renderInline(block.text, { ...context, line: block.line })}</h${block.level}>`;
      }
      if (block.type === 'paragraph') {
        return `<p>${renderInline(block.text.join(' '), { ...context, line: block.line })}</p>`;
      }
      return renderList(block, context);
    })
    .join('\n');
}

// ADR cross-links become their page on the site; any other relative link has
// no published target, so it fails rather than shipping a broken link.
export function adrLinkRewriter(knownIds) {
  return (href, context) => {
    const adr = href.match(/^(\d{3})-[a-z0-9-]+\.md(#[a-z0-9-]+)?$/);
    if (adr) {
      if (!knownIds.has(adr[1])) {
        throw new MarkdownError(`${context.file}:${context.line}: link to ADR-${adr[1]}, which does not exist`);
      }
      return `/architecture/decisions/${adr[1]}/${adr[2] || ''}`;
    }
    return defaultRewriteLink(href, context);
  };
}
