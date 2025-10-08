// get started screen
import React from "react";
import { Text, TouchableOpacity, StyleSheet, ScrollView, View } from "react-native";
import { theme } from "../../assets/theme"
import { useRouter } from "expo-router";

export default function GetStarted() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>PACT</Text>

                <Text>Welcome to Pact!</Text>

                <TouchableOpacity style={[styles.button]}>
                    <Text style={styles.buttonText}>Get Started</Text>
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