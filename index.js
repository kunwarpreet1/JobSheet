import 'react-native-url-polyfill/auto';
/**
 * @format
 */

if (__DEV__) {
  require('./src/config/ReactotronConfig');
} else {
  console.tron = {
    log: () => {},
    warn: () => {},
    error: () => {},
    display: () => {},
    clear: () => {},
  };
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
