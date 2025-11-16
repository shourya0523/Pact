import React from "react";
// testin testing
import { Text, Image, View, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import GoogleSignIn from "../../../components/GoogleSignIn";

export default function WelcomeScreen() {
    const router = useRouter();
    const [showGoogleSignIn, setShowGoogleSignIn] = React.useState(false);

    const handleGoogleSignIn = () => {
        console.log("Google Sign-In button pressed!");
        Alert.alert("Debug", "Button was pressed!");
        setShowGoogleSignIn(true);
    };

    // If user wants to use Google Sign-In, show that component instead
    if (showGoogleSignIn) {
        console.log("Showing GoogleSignIn component");
        return <GoogleSignIn />;
    }

    return (
        <View className="flex-1 bg-[#291133]">
            <View className="flex-1 items-center justify-center px-8 -mt-16">
                <View className="items-center mb-8">
                    <Image 
                        source={require('../../images/space/logo.png')}
                        className="w-20 h-20 mb-4"
                        resizeMode="contain"
                    />

                    <Text className="text-white text-5xl font-bold tracking-widest">
                        Pact
                    </Text>
                </View>

                <Text className="text-white text-4xl font-bold text-center mb-6">
                    Welcome to Pact!
                </Text>

                <Text className="text-white text-center text-lg leading-7 max-w-sm mb-12">
                    Everything is easier when you are not alone. Pact keeps your progress linked
                    with a partner, so you are never pushing forward in isolation.
                </Text>

                <View className="items-center mb-8">
                    <View className="flex-row gap-3 mb-3">
                        <View className="px-6 py-3 bg-[#835994] rounded-full">
                            <Text className="text-white text-sm font-medium tracking-wide">
                                ACCOUNTABILITY
                            </Text>
                        </View>
                        <View className="px-6 py-3 bg-[#835994] rounded-full">
                            <Text className="text-white text-sm font-medium tracking-wide">
                                COMMUNITY
                            </Text>
                        </View>
                        <View className="px-6 py-3 bg-[#835994] rounded-full">
                            <Text className="text-white text-sm font-medium tracking-wide">
                                GROWTH
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        className="w-full py-5 bg-[#81849845] rounded-full items-center mb-4"
                        activeOpacity={0.27}
                        onPress={() => router.push("/screens/auth/SignupScreen")}
                    >
                        <Text className="text-white text-lg font-semibold tracking-wide">
                            GET STARTED
                        </Text>
                    </TouchableOpacity>

                    {/* Google Sign-In Button - Using inline styles to ensure it's pressable */}
                    <TouchableOpacity 
                        style={styles.googleButton}
                        activeOpacity={0.8}
                        onPress={handleGoogleSignIn}
                    >
                        <Text style={styles.googleButtonText}>
                            Sign in with Google
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text className="text-white/70 text-sm text-center mt-6">
                    By continuing, you agree to our Terms & Privacy Policy
                </Text>

                {/* Sign In Link for Returning Users */}
                <TouchableOpacity
                    style={styles.signInButton}
                    onPress={() => router.push("/screens/auth/LoginScreen")}
                >
                    <Text style={styles.signInText}>
                        Already have an account? <Text style={styles.signInTextBold}>Sign In</Text>
                    </Text>
                </TouchableOpacity>

                {/* Development Test Login Link */}
                <TouchableOpacity
                    style={styles.testLoginButton}
                    onPress={() => router.push("/screens/auth/TestLogin")}
                >
                    <Text style={styles.testLoginText}>🔧 Test Login (Dev)</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    buttonContainer: {
        width: '100%',
        zIndex: 10,
    },
    googleButton: {
        width: '100%',
        paddingVertical: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleButtonText: {
        color: '#291133',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 1,
    },
    signInButton: {
        marginTop: 16,
        padding: 12,
    },
    signInText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        textAlign: 'center',
    },
    signInTextBold: {
        color: 'white',
        fontWeight: '700',
    },
    testLoginButton: {
        marginTop: 20,
        padding: 12,
    },
    testLoginText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        textAlign: 'center',
    }
});
