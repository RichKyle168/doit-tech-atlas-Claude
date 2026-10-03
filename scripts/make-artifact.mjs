// Turns the single-file Vite build into a page body for claude.ai Artifacts
// (the host supplies <!doctype>, <html>, <head> and <body>).
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('dist-artifact/index.html', 'utf8');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const cleanHead = head
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
const titleMatch = cleanHead.match(/<title>[\s\S]*?<\/title>/);
const rest = cleanHead.replace(titleMatch[0], '');
writeFileSync('dist-artifact/artifact.html', `${titleMatch[0]}\n${rest.trim()}\n${body.trim()}\n`);
console.log('dist-artifact/artifact.html', (readFileSync('dist-artifact/artifact.html').length / 1024).toFixed(1), 'KB');
