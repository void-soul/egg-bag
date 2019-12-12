import Enum from './Enum';

export default class {
  static SOCKET_ALL = new Enum('DDDMMMCCEEEE', '所有登录人room');
  static SOCKET_USER = new Enum('USER-', '用户个人room');
  static SOCKET_DEV = new Enum('DEV-', '单次登录room');
}
