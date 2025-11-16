import { Platform } from "react-native";

const getBaseUrlSync = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  } else if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  } else {
    return 'http://localhost:8000';
  }
};

export const BASE_URL = getBaseUrlSync();

export const getBaseUrl = async (): Promise<string> => {
  return BASE_URL;
};

console.log('🌐 Platform:', Platform.OS);
console.log('🔗 Backend URL:', BASE_URL);