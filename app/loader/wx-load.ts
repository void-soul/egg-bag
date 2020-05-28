import {Application} from 'egg';
import {WxMini} from '../wx/mini';
import {WxOrgan} from '../wx/organ';
import {WxPay} from '../wx/pay';
const debug = require('debug')('egg-bag:loader');
export function loadWXMini(this: Application) {
  if (this.config.wxMini) {
    this._wxMini = {};
    for (const appCode of Object.keys(this.config.wxMini)) {
      debug(`read wx-mini ${ appCode }`);
      this._wxMini[appCode] = new WxMini(this, appCode);
    }
  } else {
    debug('not found wx-mini-config');
  }
}

export function loadWXOrgan(this: Application) {
  if (this.config.wxOrgan) {
    this._wxOrgan = {};
    for (const appCode of Object.keys(this.config.wxOrgan)) {
      debug(`read wx-organ ${ appCode }`);
      this._wxOrgan[appCode] = new WxOrgan(this, appCode);
    }
  } else {
    debug('not found wx-organ-config');
  }
}

export function loadWXPay(this: Application) {
  if (this.config.wxPay) {
    this._wxPay = {};
    for (const appCode of Object.keys(this.config.wxPay)) {
      debug(`read wx-pay ${ appCode }`);
      this._wxPay[appCode] = new WxPay(this, appCode);
    }
  } else {
    debug('not found wx-organ-config');
  }
}