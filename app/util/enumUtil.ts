import {EnmuJson} from '../../typings';

let configData: EnmuJson | null = null;
export const enumToJson = (GlobalValues: any): EnmuJson => {
  if (configData) {
    return configData;
  }
  const result = {
    GlobalArray: {},
    GlobalMap: {}
  };
  Object.keys(GlobalValues).forEach((item) => {
    const guess = /([\w\W]+)_([^_]+)$/.exec(item);
    if (
      guess &&
      guess.length === 3 &&
      guess[2].toLowerCase() === GlobalValues[item].value().toLowerCase()
    ) {
      if (!result.GlobalArray[guess[1]]) {
        result.GlobalArray[guess[1]] = [];
      }
      result.GlobalArray[guess[1]].push([
        GlobalValues[item].value(),
        GlobalValues[item].desc()
      ]);

      if (!result.GlobalMap[guess[1]]) {
        result.GlobalMap[guess[1]] = {};
      }
      result.GlobalMap[guess[1]][GlobalValues[item].value()] = GlobalValues[
        item
      ].desc();
    }
  });
  configData = result;
  return result;
};
export const dataConfig = (configName: string, valueName: string) => {
  return configData && configData.GlobalMap[configName] && configData.GlobalMap[configName][valueName];
};
