import {BaseWx} from './base';
import {Application} from 'egg';
import {WxOrganConfig, WxDepartment, WxOrganUser, WxOrganUserSimply, WxOrganText, WxOrganImage, WxOrganVoice, WxOrganVideo, WxOrganFile, WxOrganTextCard, WxOrganNews, WxOrganMpNews, WxOrganMarkDown, WxOrganTaskCard, WxOrganMini} from '../../typings';
export class WxOrgan extends BaseWx {
  protected name = 'wxOrgan';
  private config: WxOrganConfig;
  private miniMessCache: {[name: string]: Array<{appid: string; page: string}>}; // 小程序消息缓存
  private messCache: {[name: string]: Array<{agentid: number; msgtype: string; safe?: number}>}; // 非小程序消息缓存
  // private aesKey: Buffer | undefined;
  // private iv: Buffer | undefined;
  constructor (app: Application, appCode: string) {
    super(app, appCode);
    this.config = app.config.wxOrgan![appCode];
    this.tokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${ this.config.corpid }&corpsecret=${ this.config.corpsecret }`;
    this.miniMessCache = {};
    this.messCache = {};
    // if (this.config.msHook) {
    //   this.aesKey = new Buffer(this.config.encodingAESKey + '=', 'base64');
    //   this.iv = this.aesKey.slice(0, 16);
    // }
    if (this.config.miniMessages) {
      for (const item of this.config.miniMessages) {
        if (!this.miniMessCache[item.name]) {
          this.miniMessCache[item.name] = [];
        }
        this.miniMessCache[item.name].push({
          appid: this.config.appid!,
          page: `pages/${ item.model }/${ item.page }/${ item.page }`
        });
      }
    }
    if (this.config.messages) {
      for (const item of this.config.messages) {
        if (!this.messCache[item.name]) {
          this.messCache[item.name] = [];
        }
        this.messCache[item.name].push({
          agentid: this.config.agentid!,
          ...item
        });
      }
    }

    this.mock = this.config.mock === true;
  }
  async createDepartment(param: WxDepartment): Promise<number> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/department/create?access_token=${ token }`,
      'post',
      param
    );
    return data.id;
  }
  async updateDepartment(param: WxDepartment): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/department/update?access_token=${ token }`,
      'post',
      param
    );
  }
  async deleteDepartment(id: number): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/department/delete?access_token=${ token }`,
      'get',
      {id}
    );
  }
  async getDepartmentList(id?: number): Promise<WxDepartment[]> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/department/list?access_token=${ token }`,
      'get',
      {id}
    );
    return data.department;
  }
  async createUser(param: WxOrganUser): Promise<string | number> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/create?access_token=${ token }`,
      'post',
      param
    );
    return data.id;
  }
  async getUser(userid: number | string): Promise<WxOrganUser> {
    return await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${ token }`,
      'get',
      {userid}
    );
  }
  async updateUser(param: WxOrganUser): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/update?access_token=${ token }`,
      'post',
      param
    );
  }
  async deleteUser(userid: number | string): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/delete?access_token=${ token }`,
      'get',
      {userid}
    );
  }
  async batchDeleteUser(useridlist: Array<number | string>): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/batchdelete?access_token=${ token }`,
      'post',
      {useridlist}
    );
  }
  async getDeptUserSimply(department_id: number, fetch_child: boolean): Promise<WxOrganUserSimply[]> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/simplelist?access_token=${ token }`,
      'get',
      {department_id, fetch_child: fetch_child ? 'FETCH_CHILD' : undefined}
    );
    return data.userlist;
  }
  async getDeptUser(department_id: number, fetch_child: boolean): Promise<WxOrganUser[]> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/list?access_token=${ token }`,
      'get',
      {department_id, fetch_child: fetch_child ? 'FETCH_CHILD' : undefined}
    );
    return data.userlist;
  }
  async userid2openid(userid: number | string): Promise<string> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/convert_to_openid?access_token=${ token }`,
      'post',
      {userid}
    );
    return data.openid;
  }
  async openid2userid(openid: string): Promise<number | string> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/convert_to_userid?access_token=${ token }`,
      'post',
      {openid}
    );
    return data.userid;
  }
  async authsucc(userid: string): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/user/authsucc?access_token=${ token }`,
      'get',
      {userid}
    );
  }
  async inviteUsers({user, party, tag}: {user?: Array<number | string>; party?: number[]; tag?: number[]}): Promise<{invaliduser?: Array<number | string>; invalidparty?: number[]; invalidtag?: number[]}> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/batch/invite?access_token=${ token }`,
      'post',
      {user, party, tag}
    );
    return {
      invaliduser: data.invaliduser,
      invalidparty: data.invalidparty,
      invalidtag: data.invalidtag
    };
  }
  async createTag(tagname: string, tagid: number): Promise<number> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/tag/create?access_token=${ token }`,
      'post',
      {tagname, tagid}
    );
    return data.id;
  }
  async updateTag(tagname: string, tagid: number): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/tag/update?access_token=${ token }`,
      'post',
      {tagname, tagid}
    );
  }
  async deleteTag(tagid: number): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/tag/delete?access_token=${ token }`,
      'get',
      {tagid}
    );
  }
  async createTagUser(tagid: number, userlist: Array<string | number>): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/tag/addtagusers?access_token=${ token }`,
      'post',
      {tagid, userlist}
    );
  }
  async deleteTagUser(tagid: number, userlist: Array<string | number>): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/tag/deltagusers?access_token=${ token }`,
      'post',
      {tagid, userlist}
    );
  }
  async getTagUser(tagid: number): Promise<{tagname: string; userlist: Array<{userid: string | number; name: string}>; partylist: number[]}> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/tag/get?access_token=${ token }`,
      'get',
      {tagid}
    );
    return data;
  }
  async getTag(): Promise<Array<{tagid: number; tagname: string}>> {
    const data = await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/tag/list?access_token=${ token }`,
      'get',
      {}
    );
    return data.taglist;
  }
  async updateTaskCard(userids: Array<string | number>, task_id: string, clicked_key: string): Promise<void> {
    await this.fetch(
      (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/message/update_taskcard?access_token=${ token }`,
      'post',
      {userids, task_id, clicked_key}
    );
  }
  async sendMiniMs(
    {touser, toparty, totag, name, scene, ms}: {
      touser?: Array<number | string>;
      toparty?: number[];
      totag?: number[];
      name: string;
      scene?: string;
      ms: WxOrganMini;
    }): Promise<void> {
    const touser_ = touser ? touser.join('|') : undefined;
    const toparty_ = toparty ? toparty.join('|') : undefined;
    const totag_ = totag ? totag.join('|') : undefined;
    if (scene) {
      scene = `?${ scene }`;
    } else {
      scene = '';
    }
    if (ms.content_item) {
      for (const [key, value] of Object.entries(ms.content_item)) {
        ms.content_item[key] = value ?? '';
      }
    }

    const temps = this.miniMessCache[name];
    for (const item of temps) {
      await this.fetch(
        (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${ token }`,
        'post',
        {
          touser: touser_,
          toparty: toparty_,
          totag: totag_,
          'msgtype': 'miniprogram_notice',
          miniprogram_notice: {
            ...item,
            page: `${ item.page }${ scene }`,
            ...ms
          },
          enable_id_trans: 0
        }
      );
    }
  }
  async sendMs(
    {touser, toparty, totag, name, ms}: {
      touser?: Array<number | string>;
      toparty?: number[];
      totag?: number[];
      name: string;
      ms: WxOrganText | WxOrganImage | WxOrganVoice | WxOrganVideo | WxOrganFile | WxOrganTextCard | WxOrganNews | WxOrganMpNews | WxOrganMarkDown | WxOrganTaskCard;
    }): Promise<void> {
    const touser_ = touser ? touser.join('|') : undefined;
    const toparty_ = toparty ? toparty.join('|') : undefined;
    const totag_ = totag ? totag.join('|') : undefined;
    const temps = this.messCache[name];
    for (const item of temps) {
      await this.fetch(
        (token: string) => `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${ token }`,
        'post',
        {
          touser: touser_,
          toparty: toparty_,
          totag: totag_,
          ...item,
          [item.msgtype]: ms,
          enable_id_trans: 0
        });
    }
  }
}
