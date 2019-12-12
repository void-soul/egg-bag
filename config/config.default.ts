import {EggAppConfig, PowerPartial, EggAppInfo} from 'egg';
import {join} from 'path';
export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;
  config.io = {
    namespace: {
      '/': {
        connectionMiddleware: ['IAuth'],
        packetMiddleware: []
      }
    }
  };
  config.logger = {
    level: 'INFO'
  };
  config.bodyParser = {
    formLimit: `${ 1024 * 1024 * 100 }`,
    jsonLimit: `${ 1024 * 1024 * 100 }`
  };
  config.picCode = {
    size: 4,
    ignoreChars: '0o1ilj',
    noise: 3,
    color: true,
    background: '#ffffff'
  };
  config.session = {
    socketLogout: true,
    sessionContinueMinutes: 10,
    sessionMinutes: 0
  };
  config.view = {
    root: join(appInfo.baseDir, 'app/views'),
    cache: process.env.NODE_ENV === 'production',
    defaultExtension: '.html',
    defaultViewEngine: 'nunjucks',
    mapping: {
      '.html': 'nunjucks'
    }
  };
  config.nunjucks = {
    autoescape: false,
    throwOnUndefined: false,
    trimBlocks: true,
    lstripBlocks: true,
    cache: process.env.NODE_ENV === 'production',
    watch: process.env.NODE_ENV !== 'production'
  };
  config.security = {
    csrf: {
      enable: false
    }
  };
  return config;
};
