// Same thing as login screen (can also be a modal )
import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, View, Alert } from "react-native";
import { theme } from "../../assets/theme"
import { useRouter } from "expo-router";

export default function SignupScreen() {
    const router = useRouter();
    // const [displayName, setDisplayName] = useState(""); TODO: Do we have display name for users????
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // TODO : storing tokens
    const handleSignup = async () => {
        if (!username || !email || !password) {
            Alert.alert("Missing fields", "Please fill out all fields.");
            return;
        }

        if (password.length < 8) {
            Alert.alert("Password too short", "Password must be longer than 8 characters.")
            return;
        }

        if (password.length > 72) {
            Alert.alert("Password too long", "Password connot be longer than 72 characters.");
            return;
            // TODO : change this later?
        }

        console.log({ username, email, password });
        
        try {
            const response = await fetch("http://localhost:8000/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                }),
            });
            console.log(response.status);
            const data = await response.json();
            console.log(data);

            if (response.ok) {
                router.push("/screens/auth/Onboarding");
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
                <Text style={styles.title}>Create your account</Text>

                <TouchableOpacity style={[styles.button, styles.googleButton]}>
                    <Text style={styles.googleText}>Continue with Google</Text>
                </TouchableOpacity>

                <Text style={styles.orText}>Or log in with email</Text>

                {/* <TextInput placeholder="Display name" style={styles.input}></TextInput> */}
                <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} ></TextInput>
                <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address"></TextInput>
                <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry></TextInput>

                <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSignup}>
                    <Text style={styles.primaryButtonText}>Create Account</Text>
                </TouchableOpacity>

                <Text style={styles.footerText}>
                    Already have an Account?{" "}
                    <Text style={styles.link} onPress={() => router.push("/screens/auth/LoginScreen")}>
                        Sign In
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
        fontSize: 28,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 50,
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