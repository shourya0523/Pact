import { Platform } from "react-native";

const getBaseUrlSync = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  } else if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine
    return 'http://10.0.2.2:8000';
  } else {
    // iOS - use local IP for physical device (works for simulator too if on same network)
    // Replace with your machine's local IP if different
    return 'http://10.0.0.64:8000';
  }
};

export const BASE_URL = getBaseUrlSync();

export const getBaseUrl = async (): Promise<string> => {
  return BASE_URL;
};

console.log('🌐 Platform:', Platform.OS);
console.log('🔗 Backend URL:', BASE_URL);