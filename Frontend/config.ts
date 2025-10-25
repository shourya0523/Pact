import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";

let BASE_URL = "http://localhost:8000";

export const getBaseUrl = async (): Promise<string> => {
    if (Platform.OS === "web") {
        return BASE_URL;
    }

    const state = await NetInfo.fetch();

    if (state.details && "ipAddress" in state.details) {
        return `https://${state.details.ipAddress}:8000`;
    }

    return BASE_URL;
}