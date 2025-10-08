// onboarding page
import React from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, View } from "react-native";
import { theme } from "../../assets/theme"
import { useRouter } from "expo-router";

export default function LoginScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Dont track your habits alone! Invite a Friend</Text>

                <Text>Everything is easier when you are not alone. Pact keeps your progress 
                    linked with a partner, so you are never pushing forward in isolation.</Text>

                <TextInput placeholder="Link" style={styles.input} secureTextEntry></TextInput>

                <TouchableOpacity style={[styles.button]}>
                    <Text style={styles.buttonText}>Copy Link</Text>
                </TouchableOpacity>

                
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

    buttonText: {
        color: theme.colors.text,
        fontWeight: "600",
    },
})