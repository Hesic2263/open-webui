// 简化版 utils/index.ts - 移除所有可能导致构建错误的内容
import { v4 as uuidv4 } from 'uuid';
import sha256 from 'js-sha256';
import { WEBUI_BASE_URL } from '$lib/constants';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// PDF功能已禁用
const pdfWorkerUrl = '';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const replaceTokens = (content: string, sourceIds: any, char: string, user: string) => {
    // 简化版本，移除复杂逻辑
    let result = content;
    result = result.replace(/{{char}}/gi, char || '');
    result = result.replace(/{{user}}/gi, user || '');
    return result;
};

export const sanitizeResponseContent = (content: string) => {
    return content
        .replace(/<\|[a-z]*$/, '')
        .replace(/<\|[a-z]+\|$/, '')
        .replace(/<$/, '')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .trim();
};

export const processResponseContent = (content: string) => {
    return content.trim();
};

export function unescapeHtml(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent || '';
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

export const convertMessagesToHistory = (messages: any[]) => {
    const history = {
        messages: {},
        currentId: null
    };

    let parentMessageId: string | null = null;

    messages.forEach((message) => {
        const messageId = uuidv4();
        (history.messages as any)[messageId] = {
            ...message,
            id: messageId,
            parentId: parentMessageId,
            childrenIds: []
        };

        if (parentMessageId) {
            (history.messages as any)[parentMessageId].childrenIds.push(messageId);
        }

        parentMessageId = messageId;
        history.currentId = messageId;
    });

    return history;
};

export const getGravatarURL = (email: string) => {
    const address = String(email).trim().toLowerCase();
    const hash = sha256(address);
    return `https://www.gravatar.com/avatar/${hash}`;
};

export const sleepAsync = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));