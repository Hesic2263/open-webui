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

// PDF.js worker 导入修复 - 禁用PDF功能以解决构建问题
const pdfWorkerUrl = '';

import { marked } from 'marked';
import markedExtension from '$lib/utils/marked/extension';
import markedKatexExtension from '$lib/utils/marked/katex-extension';
import hljs from 'highlight.js';

//////////////////////////
// Helper functions
//////////////////////////

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function escapeRegExp(string: string): string {
 return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const replaceTokens = (content, sourceIds, char, user) => {
 const tokens = [
  { regex: /{{char}}/gi, replacement: char },
  { regex: /{{user}}/gi, replacement: user },
  {
   regex: /{{VIDEO_FILE_ID_([a-f0-9-]+)}}/gi,
   replacement: (_, fileId) =>
    <video src="${WEBUI_BASE_URL}/api/v1/files/${fileId}/content" controls></video>
  },
  {
   regex: /{{HTML_FILE_ID_([a-f0-9-]+)}}/gi,
   replacement: (_, fileId) => <file type="html" id="${fileId}" />
  }
 ];

 // Replace tokens outside code blocks only
 const processOutsideCodeBlocks = (text, replacementFn) => {
  return text
   .split(/(```[\s\S]*?```|`[\s\S]*?`)/)
   .map((segment) => {
    return segment.startsWith('```') || segment.startsWith('`')
     ? segment
     : replacementFn(segment);
   })
   .join('');
 };

 // Apply replacements
 content = processOutsideCodeBlocks(content, (segment) => {
  tokens.forEach(({ regex, replacement }) => {
   if (replacement !== undefined && replacement !== null) {
    segment = segment.replace(regex, replacement);
   }
  });

  if (Array.isArray(sourceIds)) {
   sourceIds.forEach((sourceId, idx) => {
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
 content = processChineseContent(content);
 return content.trim();
};

function isChineseChar(char: string): boolean {
 return /\p{Script=Han}/u.test(char);
}

// Tackle "Model output issue not following the standard Markdown/LaTeX format" in Chinese.
function processChineseContent(content: string): string {
 // This function is used to process the response content before the response content is rendered.
 const lines = content.split('\n');
 const processedLines = lines.map((line) => {
  if (/[\u4e00-\u9fa5]/.test(line)) {
   // Problems caused by Chinese parentheses
   /* Discription:
    *   When `*` has Chinese delimiters on the inside, markdown parser ignore bold or italic style.
    *   - e.g. **中文名（English）**中文内容 will be parsed directly,
    *          instead of `<strong>中文名（English）</strong>中文内容`.
    * Solution:
    *   Adding a space before and after the bold/italic part can solve the problem.
    *   - e.g. **中文名（English）**中文内容 ->  **中文名（English）** 中文内容
    * Note:
    *   Similar problem was found with English parentheses and other full delimiters,
    *   but they are not handled here because they are less likely to appear in LLM output.
    *   Change the behavior in future if needed.
    */
   if (line.includes('*')) {
    // Handle **bold** and italic
    // 1. With Chinese parentheses
    if (/（|）/.test(line)) {
     line = processChineseDelimiters(line, '**', '（', '）');
     line = processChineseDelimiters(line, '*', '（', '）');
    }
    // 2. With Chinese quotations
    if (/「|」/.test(line)) {
     line = processChineseDelimiters(line, '**', '「', '」');
     line = processChineseDelimiters(line, '*', '「', '」');
    }
   }
  }
  return line;
 });
 content = processedLines.join('\n');

 return content;
}

// Helper function for processChineseContent
function processChineseDelimiters(
 line: string,
 symbol: string,
 leftSymbol: string,
 rightSymbol: string
): string {
 // NOTE: If needed, with a little modification, this function can be applied to more cases.
 const escapedSymbol = escapeRegExp(symbol);
 const regex = new RegExp(
  `(.?)(?<!${escapedSymbol})(${escapedSymbol})([^${escapedSymbol}]+)(${escapedSymbol})(?!${escapedSymbol})(.)`,
  'g'
 );
 return line.replace(regex, (match, l, left, content, right, r) => {
  const result =
   (content.startsWith(leftSymbol) && l && l.length > 0 && isChineseChar(l[l.length - 1])) ||
   (content.endsWith(rightSymbol) && r && r.length > 0 && isChineseChar(r[0]));

  if (result) {
   return `${l} ${left}${content}${right} ${r}`;
  } else {
   return match;
  }
 });
}

export function unescapeHtml(html: string) {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 return doc.documentElement.textContent;
}

export const capitalizeFirstLetter = (string) => {
 return string.charAt(0).toUpperCase() + string.slice(1);
};

export const splitStream = (splitOn) => {
 let buffer = '';
 return new TransformStream({
  transform(chunk, controller) {
   buffer += chunk;
   const parts = buffer.split(splitOn);
   parts.slice(0, -1).forEach((part) => controller.enqueue(part));
   buffer = parts[parts.length - 1];
  },
  flush(controller) {
   if (buffer) controller.enqueue(buffer);
  }
 });
};

export const convertMessagesToHistory = (messages) => {
 const history = {
  messages: {},
  currentId: null
 };

 let parentMessageId = null;
 let messageId = null;

 for (const message of messages) {
  messageId = uuidv4();

  if (parentMessageId !== null) {
   history.messages[parentMessageId].childrenIds = [
    ...history.messages[parentMessageId].childrenIds,
    messageId
   ];
  }

  history.messages[messageId] = {
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

export const getGravatarURL = (email) => {
 // Trim leading and trailing whitespace from
 // an email address and force all characters
 // to lower case
 const address = String(email).trim().toLowerCase();

 // Create a SHA256 hash of the final string
 const hash = sha256(address);

 // Grab the actual image URL
 return `https://www.gravatar.com/avatar/${hash}`;
};

export const canvasPixelTest = () => {
 // Test a 1x1 pixel to potentially identify browser/plugin fingerprint blocking or spoofing
 // Inspiration: https://github.com/kkapsner/CanvasBlocker/blob/master/test/detectionTest.js
 const canvas = document.createElement('canvas');
 const ctx = canvas.getContext('2d');
 canvas.height = 1;
 canvas.width = 1;
 const imageData = new ImageData(canvas.width, canvas.height);
 const pixelValues = imageData.data;

 // Generate RGB test data
 for (let i = 0; i < imageData.data.length; i += 1) {
  if (i % 4 !== 3) {
   pixelValues[i] = Math.floor(256 * Math.random());
  } else {
   pixelValues[i] = 255;
  }
 }

 ctx.putImageData(imageData, 0, 0);
 const p = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

 // Read RGB data and fail if unmatched
 for (let i = 0; i < p.length; i += 1) {
  if (p[i] !== pixelValues[i]) {
   console.log(
    'canvasPixelTest: Wrong canvas pixel RGB value detected:',
    p[i],
    'at:',
    i,
    'expected:',
    pixelValues[i]
   );
   console.log('canvasPixelTest: Canvas blocking or spoofing is likely');
   return false;
  }
 }

 return true;
};

export const compressImage = async (imageUrl, maxWidth, maxHeight) => {
 return new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
   const canvas = document.createElement('canvas');
   let width = img.width;
   let height = img.height;

   // Maintain aspect ratio while resizing

   if (maxWidth && maxHeight) {
    // Resize with both dimensions defined (preserves aspect ratio)

    if (width <= maxWidth && height <= maxHeight) {
     resolve(imageUrl);
     return;
    }

    if (width / height > maxWidth / maxHeight) {
     height = Math.round((maxWidth * height) / width);
     width = maxWidth;
    } else {
     width = Math.round((maxHeight * width) / height);
     height = maxHeight;
    }
   } else if (maxWidth) {
    // Only maxWidth defined

    if (width <= maxWidth) {
     resolve(imageUrl);
     return;
    }

    height = Math.round((maxWidth * height) / width);
    width = maxWidth;
   } else if (maxHeight) {
    // Only maxHeight defined

    if (height <= maxHeight) {
     resolve(imageUrl);
     return;
    }

    width = Math.round((maxHeight * width) / height);
    height = maxHeight;
   }

   canvas.width = width;
   canvas.height = height;

   const context = canvas.getContext('2d');
   context.drawImage(img, 0, 0, width, height);

   // Get compressed image URL
   const compressedUrl = canvas.toDataURL();
   resolve(compressedUrl);
  };
  img.onerror = (error) => reject(error);
  img.src = imageUrl;
 });
};

export const generateInitialsImage = (name) => {
 const canvas = document.createElement('canvas');
 const ctx = canvas.getContext('2d');
 canvas.width = 100;
 canvas.height = 100;

 if (!canvasPixelTest()) {
  console.log(
   'generateInitialsImage: failed pixel test, fingerprint evasion is likely. Using default image.'
  );
  return `${WEBUI_BASE_URL}/user.png`;
 }

 ctx.fillStyle = '#F39C12';
 ctx.fillRect(0, 0, canvas.width, canvas.height)