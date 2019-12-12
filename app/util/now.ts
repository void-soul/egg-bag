import * as day from 'dayjs';
export const dateTime = 'YYYY-MM-DD HH:mm:ss';
export const dateXSDTime = 'YYYY-MM-DDTHH:mm:ss';
export const date = 'YYYY-MM-DD';
export const nowTime = () => day().format(dateTime);
export const nowDate = () => day().format(date);
export const nowTimeXSD = () => day().format(dateXSDTime);
