import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { marked } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'marked');
const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const base = await read('./physics-iii-ch03-refraction-notes.md');
const extra = await read('./physics-iii-ch03-expansion.md');
const sections = source => Object.fromEntries(source.split(/^## /m).slice(1).map(section => {
  const cut = section.indexOf('\n');
  return [section.slice(0, cut).trim(), section.slice(cut + 1).trim()];
}));
const additions = sections(extra);
const keys = ['basics', 'snell', 'tir', 'color', 'lens', 'formulas', 'review', 'sources'];
const lessons = Object.fromEntries(Object.entries(sections(base)).map(([title, content], index) => {
  const key = keys[index];
  if (key === 'review') {
    const [questions, solutions] = content.split(/^### 參考答案與理由$/m);
    content = marked.parse(questions) + '<details><summary>展開 12 題參考答案與理由</summary>' + marked.parse(solutions) + '</details>';
  } else {
    content = marked.parse(content) + (additions[key] ? marked.parse(additions[key]) : '');
  }
  return [key, { title, content }];
}));
await writeFile(new URL('./physics-iii-ch03-lessons.js', import.meta.url), 'window.opticsLessons = ' + JSON.stringify(lessons, null, 2) + ';\n', 'utf8');
