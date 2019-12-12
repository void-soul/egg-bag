import * as nanoid from 'nanoid';

export const uuid = (): string => {
  return nanoid();
};
/**
 * 通过uri获取key
 * @param uri
 */
export const getPicKey = (uri: string): string => {
  const arr = uri.match(/key=([0-9a-zA-Z.]+)/);
  if (arr && arr.length === 2) {
    return arr[1];
  }
  return uri;
};

export const emptyString = (source: any, dealEmptyString = true): boolean => {
  return (
    source === null ||
    source === undefined ||
    (dealEmptyString === true && (source === '' || `${ source }`.replace(/\s/g, '') === ''))
  );
};

export const notEmptyString = (source: any, dealEmptyString = true): boolean => {
  return emptyString(source, dealEmptyString) === false;
};

export const safeString = (source?: string): string => {
  if (source) {
    return `${ source }`.replace(/'/g, '');
  }
  return '';
};

export const randomNumber = (len: number): string => {
  return `${ parseInt(`${ (Math.random() * 9 + 1) * Math.pow(10, (len - 1)) }`, 10) }`;
};
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const charLen = chars.length;
export const randomString = (len: number): string => {
  return Array.from(new Array(len)).map(() => chars.charAt(Math.floor(Math.random() * charLen))).join('');
};
export const buildWxStr = (data: {[key: string]: string}, maxLabelLength: number, ...titles: string[]) => {
  let str = titles.join('\r\n');
  str += '\r\n\r\n';
  const items = new Array<string>();
  // const maxLength = maxLabelLength * 2;
  for (const [key, value] of Object.entries(data)) {
    if (notEmptyString(value)) {
      const len = maxLabelLength - key.length;
      items.push(`${ key }：${ ''.padEnd(len * 3 + (len > 0 ? 1 : 0), ' ') }${ value }`);
    }
  }
  str += items.join('\r\n');
  return str;
};
const chinese = /[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/g;
const table = {
  '！': '!',
  '￥': '$',
  '…': '.',
  '（': '(',
  '）': ')',
  '《': '<',
  '》': '>',
  '？': '?',
  '：': ':',
  '“': `'`,
  '”': `'`,
  '’': `'`,
  '‘': `'`,
  '，': ',',
  '。': '.',
  '、': '/',
  '；': ';',
  '〈': '<',
  '〉': '>',
  '【': '[',
  '】': ']',
  '『': '[',
  '』': ']',
  '「': '[',
  '」': ']',
  '﹃': '[',
  '﹄': ']',
  '〔': '(',
  '〕': ')',
  '—': '-',
  '～': '~',
  '﹏': '~'
};
export const replaceChineseCode = (str: string) => {
  return str.replace(chinese, (a: string) => table[a] || '');
};
