import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const assetPathRegex = /(\.{2}\/)+assets\//g;
const scriptRegex = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const doctypeRegex = /<!doctype[^>]*>/gi;
const metaRegex = /<meta\b[^>]*>/gi;
const linkRegex = /<link\b[^>]*>/gi;
const titleRegex = /<title\b[^>]*>[\s\S]*?<\/title>/gi;

const removeTag = (content: string, tag: string) => {
  const openTag = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  const closeTag = new RegExp(`</${tag}>`, 'gi');
  return content.replace(openTag, '').replace(closeTag, '');
};

const sanitizeMarkup = (raw: string) => {
  let content = raw.replace(/\r\n/g, '\n');
  content = content.replace(scriptRegex, '');
  content = content.replace(doctypeRegex, '');
  content = removeTag(content, 'html');
  content = removeTag(content, 'head');
  content = removeTag(content, 'body');
  content = content.replace(metaRegex, '');
  content = content.replace(linkRegex, '');
  content = content.replace(titleRegex, '');
  content = content.replace(assetPathRegex, '/assets/');
  return content.trim();
};

const partialCache = new Map<string, string>();

const readPartial = (relativePath: string) => {
  if (partialCache.has(relativePath)) {
    return partialCache.get(relativePath)!;
  }
  const absolutePath = join(process.cwd(), relativePath);
  const raw = readFileSync(absolutePath, 'utf-8');
  const sanitized = sanitizeMarkup(raw);
  partialCache.set(relativePath, sanitized);
  return sanitized;
};

export const loadPartial = (relativePath: string) => readPartial(relativePath);
