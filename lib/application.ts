import {Application} from 'egg';
import * as path from 'path';
const EGG_PATH = Symbol.for('egg#eggPath');

export default class BagApplication extends Application {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
}
