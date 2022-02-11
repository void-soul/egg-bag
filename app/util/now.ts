import * as day from 'dayjs';
export const dateTime = 'YYYY-MM-DD HH:mm:ss';
export const dateXSDTime = 'YYYY-MM-DDTHH:mm:ss';
export const date = 'YYYY-MM-DD';
export const nowTime = () => day().format(dateTime);
export const nowDate = () => day().format(date);
export const nowTimeXSD = () => day().format(dateXSDTime);
export const dateFormat = (str: any, format?: string) => {
  if (str) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return day(str).format(format || dateTime);
  } else {
    return str;
  }
};
