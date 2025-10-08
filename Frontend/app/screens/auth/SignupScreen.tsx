// Same thing as login screen (can also be a modal )
import React from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, View } from "react-native";
import { theme } from "../../assets/theme"
import { useRouter } from "expo-router";

export default function SignupScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Create your account</Text>

                <TouchableOpacity style={[styles.button, styles.googleButton]}>
                    <Text style={styles.googleText}>Continue with Google</Text>
                </TouchableOpacity>

                <Text style={styles.orText}>Or log in with email</Text>

                <TextInput placeholder="Display name" style={styles.input}></TextInput>
                <TextInput placeholder="Username" style={styles.input}></TextInput>
                <TextInput placeholder="Email" style={styles.input} keyboardType="email-address"></TextInput>
                <TextInput placeholder="Password" style={styles.input} secureTextEntry></TextInput>

                <TouchableOpacity style={[styles.button, styles.primaryButton]}>
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