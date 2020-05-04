import {Application} from 'egg';
export function loadMessage(this: Application) {
  this.messenger.on('update-cache', ({key, value}: {key: string; value: any}) => this._cache[key] = value);
  this.messenger.on('remove-cache', (key: string) => {
    delete this._cache[key];
  });
}