import { DeviceEventEmitter } from 'react-native';

const storageEvents = {
  on: (event, callback) => DeviceEventEmitter.addListener(event, callback),
  off: (subscription) => {
    if (subscription && typeof subscription.remove === 'function') {
      subscription.remove();
    }
  },
  emit: (event, data) => DeviceEventEmitter.emit(event, data),
};

export default storageEvents;
