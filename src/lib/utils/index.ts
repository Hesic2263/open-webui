import { v4 as uuidv4 } from 'uuid';
import sha256 from 'js-sha256';
import { WEBUI_BASE_URL } from '$lib/constants';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(localizedFormat);

import { TTS_RESPONSE_SPLIT } from '$lib/types';

// PDF功能已禁用 - 修复构建问题
const pdfWorkerUrl = '';

import { marked } from 'marked';
import hljs from 'highlight.js';

//////////////////////////
// Helper functions
//////////////////////////

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function escapeRegExp(string: string): string {
 return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const replaceTokens = (content: any, sourceIds: any, char: any, user: any) => {
 const tokens = [
  { regex: /{{char}}/gi, replacement: char },
  { regex: /{{user}}/gi, replacement: user }
 ];

 const processOutsideCodeBlocks = (text: any, replacementFn: any) => {
  return text
   .split(/(```[\s\S]*?```|`[\s\S]*?`)/)
   .map((segment: any) => {
    return segment.startsWith('```') || segment.startsWith('`') ? segment : replacementFn(segment);
   })
   .join('');
 };

 content = processOutsideCodeBlocks(content, (segment: any) => {
  tokens.forEach(({ regex, replacement }) => {
   if (replacement !== undefined && replacement !== null) {
    segment = segment.replace(regex, replacement);
   }
  });

  if (Array.isArray(sourceIds)) {
   sourceIds.forEach((sourceId: any, idx: number) => {
    const regex = new RegExp(`\\[${idx + 1}\\]`, 'g');
    segment = segment.replace(
     regex,
     <source_id data="${idx + 1}" title="${encodeURIComponent(sourceId)}" />
    );
   });
  }

  return segment;
 });

 return content;
};

export const sanitizeResponseContent = (content: string) => {
 return content
  .replace(/<\|[a-z]*$/, '')
  .replace(/<\|[a-z]+\|$/, '')
  .replace(/<$/, '')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll(/<\|[a-z]+\|>/g, ' ')
  .trim();
};

export const processResponseContent = (content: string) => {
 return content.trim();
};

export function unescapeHtml(html: string) {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 return doc.documentElement.textContent;
}

export const capitalizeFirstLetter = (string: string) => {
 return string.charAt(0).toUpperCase() + string.slice(1);
};

export const splitStream = (splitOn: string) => {
 let buffer = '';
 return new TransformStream({
  transform(chunk: string, controller: any) {
   buffer += chunk;
   const parts = buffer.split(splitOn);
   parts.slice(0, -1).forEach((part) => controller.enqueue(part));
   buffer = parts[parts.length - 1];
  },
  flush(controller: any) {
   if (buffer) controller.enqueue(buffer);
  }
 });
};

export const convertMessagesToHistory = (messages: any) => {
 const history = {
  messages: {},
  currentId: null
 };

 let parentMessageId: any = null;
 let messageId: any = null;

 for (const message of messages) {
  messageId = uuidv4();

  if (parentMessageId !== null) {
   (history.messages as any)[parentMessageId].childrenIds = [
    ...(history.messages as any)[parentMessageId].childrenIds,
    messageId
   ];
  }

  (history.messages as any)[messageId] = {
   ...message,
   id: messageId,
   parentId: parentMessageId,
   childrenIds: []
  };

  parentMessageId = messageId;
 }

 history.currentId = messageId;
 return history;
};

export const getGravatarURL = (email: string) => {
 const address = String(email).trim().toLowerCase();
 const hash = sha256(address);
 return `https://www.gravatar.com/avatar/${hash}`;
};

export const sleepAsync = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));