import {Agent} from 'egg';
import {nowTime} from './app/util/now';

export default (agent: Agent) => {
  agent.messenger.on('egg-ready', () => {
    agent.messenger.sendRandom('start', nowTime());
  });
};
