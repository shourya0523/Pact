// Login screen (can also be a modal)
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, View, Alert } from "react-native";
import { theme } from "../../assets/theme"
import { useRouter } from "expo-router";

export default function LoginScreen() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogIn = async () => {
        try {
            const response = await fetch("http://localhost:8000/auth/login", {
                method: "POST",
                headers: {
                    "Content-type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            if (response.ok) {
                router.push("/screens/main/DashboardScreen");
            } else {
                const errorData = await response.json();
                Alert.alert("Signup failer", errorData.detail || "Error creating account");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Network error", "Could not connect to server");
        }
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Welcome Back!</Text>

                <TouchableOpacity style={[styles.button, styles.googleButton]}>
                    <Text style={styles.googleText}>Continue with Google</Text>
                </TouchableOpacity>

                <Text style={styles.orText}>Or log in with email</Text>

                <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address"></TextInput>
                <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry></TextInput>

                <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleLogIn}>
                    <Text style={styles.primaryButtonText}>Log In</Text>
                </TouchableOpacity>

                <Text style={styles.footerText}>
                    Dont have an account?{" "}
                    <Text style={styles.link} onPress={() => router.push("/screens/auth/SignupScreen")}>
                        Sign Up
                    </Text>
                </Text>

            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.backgroundColorSolid
    },

    scroll: {
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },

    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 80,
    },

    input: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: theme.sizes.radiusText,
        height: theme.sizes.inputHeight,
        paddingHorizontal: 16,
        marginVertical: 8,
    },

    button: {
        width: "100%",
        borderRadius: theme.sizes.radiusButton,
        height: theme.sizes.inputHeight,
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 8,
    },

    googleButton: {
        borderColor: "#D0D3DC",
        borderWidth: 1,
        backgroundColor: "transparent",
    },

    buttonText: {
        color: theme.colors.text,
        fontWeight: "600",
    },

    googleText: {
        color: theme.colors.text,
        fontSize: 14,
    },

    orText: {
        color: theme.colors.text,
        marginVertical: 16,
        fontSize: 14,
    },

    primaryButton: {
        backgroundColor: "#EAE6F8",
    },

    primaryButtonText: {
        color: theme.colors.text,
        fontWeight: "700",
    },

    footerText: {
        color: theme.colors.text,
        marginTop: 16,
    },

    link: {
        fontWeight: "700",
    }
})