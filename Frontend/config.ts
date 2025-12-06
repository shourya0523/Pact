import { Platform } from "react-native";
import Constants from 'expo-constants';

// Your computer's local IP address - update this if your IP changes
// Find it with: ifconfig | grep "inet " | grep -v 127.0.0.1
const LOCAL_IP = '10.0.0.64';

const getBaseUrlSync = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  } else if (Platform.OS === 'android') {
    // For Expo Go on physical Android device, use local IP
    // For Android emulator, use 10.0.2.2 instead
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    return isExpoGo ? `http://${LOCAL_IP}:8000` : 'http://10.0.2.2:8000';
  } else {
    // For Expo Go on physical iOS device, use local IP
    // For iOS simulator, use localhost
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    return isExpoGo ? `http://${LOCAL_IP}:8000` : 'http://localhost:8000';
  }
};

export const BASE_URL = getBaseUrlSync();

export const getBaseUrl = async (): Promise<string> => {
  return BASE_URL;
};

// Logging removed for performance - use logger utility in app code