// Test Login Screen
import React from "react";
import { Text, TouchableOpacity, View, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getBaseUrl } from "../../../config";

export default function TestLogin(): React.JSX.Element {
    const router = useRouter();

    const handleTestLogin = async (userNumber: number): Promise<void> => {
        try {
            const BASE_URL: string = await getBaseUrl();
            console.log(`Attempting test login for user ${userNumber} at ${BASE_URL}`);
            
            const response: Response = await fetch(`${BASE_URL}/auth/test-login/${userNumber}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data: any = await response.json();
                console.log("Test user logged in:", data);
                
                // Store the access token if needed
                // await AsyncStorage.setItem('access_token', data.access_token);
                
                Alert.alert(
                    "Success", 
                    `Logged in as test user ${userNumber}`,
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                // Navigate to the Home dashboard
                                router.replace("/screens/main/DashboardScreen");
                            }
                        }
                    ]
                );
            } else {
                const errorData: any = await response.json();
                console.error("Test login failed:", errorData);
                Alert.alert("Error", `Test login failed: ${errorData.detail || "Unknown error"}`);
            }
        } catch (error: any) {
            console.error("Test login error:", error);
            Alert.alert(
                "Network Error", 
                "Could not connect to server. Make sure the backend is running."
            );
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Test Login</Text>
            <Text style={styles.subtitle}>
                Quick access for testing
            </Text>

            <TouchableOpacity
                style={styles.button}
                activeOpacity={0.8}
                onPress={() => handleTestLogin(1)}
            >
                <Text style={styles.buttonText}>
                    Login as Test User 1 (Sohum)
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                activeOpacity={0.8}
                onPress={() => handleTestLogin(2)}
            >
                <Text style={styles.buttonText}>
                    Login as Test User 2 (Krishna)
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
            >
                <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#291133',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    title: {
        color: 'white',
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    subtitle: {
        color: 'white',
        textAlign: 'center',
        marginBottom: 48,
        opacity: 0.7,
        fontSize: 16,
    },
    button: {
        width: '100%',
        backgroundColor: '#7B3FF2',
        borderRadius: 25,
        paddingVertical: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    backButton: {
        marginTop: 32,
    },
    backButtonText: {
        color: 'white',
        fontSize: 14,
        opacity: 0.7,
    },
});
// testing testing
