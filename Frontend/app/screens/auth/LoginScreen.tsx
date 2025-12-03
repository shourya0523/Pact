import React, { useState, useEffect } from "react";
import { Text, TouchableOpacity, ScrollView, View, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { getBaseUrl } from "../../../config";
import WhiteParticles from "app/components/space/whiteStarsParticlesBackground";
import Input from "../../components/common/Text-input";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scaleFont } from "../../utils/constants";
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Google Auth Setup with Expo Auth Proxy
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: '1038322012717-h1iqh7jv8s3pb6q6dm85390po4eamlso.apps.googleusercontent.com',
        iosClientId: '1038322012717-hnel4l1370fh5tam9ccovut6av4clrik.apps.googleusercontent.com',
        webClientId: '1038322012717-73h7qf0ba1qmtefufbd4v4hea4ggrv9t.apps.googleusercontent.com',
        // Use Expo's auth proxy for development
        expoClientId: '1038322012717-73h7qf0ba1qmtefufbd4v4hea4ggrv9t.apps.googleusercontent.com',
    });

    useEffect(() => {
        if (response?.type === 'success') {
            handleGoogleSignIn(response.authentication.accessToken);
        } else if (response?.type === 'error') {
            setError('Google Sign-In failed. Please try again.');
        }
    }, [response]);

    const handleGoogleSignIn = async (googleToken: string) => {
        setLoading(true);
        try {
            const BASE_URL = await getBaseUrl();
            
            // Send Google token to your backend
            const backendResponse = await fetch(`${BASE_URL}/api/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: googleToken
                })
            });

            if (backendResponse.ok) {
                const data = await backendResponse.json();
                
                // Save authentication data
                await AsyncStorage.setItem('access_token', data.access_token);
                await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
                
                setSuccess("Login successful! Redirecting...");
                setTimeout(() => {
                    router.replace("/screens/dashboard/Home");
                }, 500);
            } else {
                setError('Google Sign-In failed. Please try regular login.');
            }
        } catch (error) {
            console.error('Google sign-in error:', error);
            setError('Google Sign-In unavailable. Please use email/password.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogIn = async () => {
        // Clear previous messages
        setError("");
        setSuccess("");

        // Input validation
        if (!email.trim() || !password.trim()) {
            setError("Please enter both email and password to continue.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        
        try {
            const BASE_URL = await getBaseUrl();
            console.log('🔗 Attempting login to:', `${BASE_URL}/api/auth/login`);
            console.log('📧 Email:', email.trim().toLowerCase());
            
            const response = await fetch(`${BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Save authentication data
                try {
                    await AsyncStorage.setItem('access_token', data.access_token);
                    await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
                    
                    setSuccess("Login successful! Redirecting...");
                    
                    // Navigate to Home after brief delay
                    setTimeout(() => {
                        router.replace("/screens/dashboard/Home");
                    }, 500);
                } catch (storageError) {
                    setError("Failed to save login information. Please try again.");
                }
            } else {
                let errorMessage = "Please check your credentials and try again.";
                
                if (data.detail) {
                    if (typeof data.detail === 'string') {
                        errorMessage = data.detail;
                    } else if (Array.isArray(data.detail)) {
                        errorMessage = data.detail
                            .map((err: any) => {
                                const field = err.loc.slice(-1)[0];
                                return `${field}: ${err.msg}`;
                            })
                            .join(', ');
                    }
                }
                
                setError(`Login Failed: ${errorMessage}`);
            }
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('fetch') || error.message.includes('Network')) {
                    setError("Unable to connect to the server. Please check your internet connection and try again.");
                } else {
                    setError("An unexpected error occurred. Please try again later.");
                }
            } else {
                setError("An unexpected error occurred. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            className="flex-1 bg-[#291133]"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <WhiteParticles />
            <ScrollView 
                className="flex-1 px-6"
                contentContainerStyle={{ paddingTop: 60, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-white font-bold text-center mb-2" style={{ fontSize: scaleFont(30) }}>PACT</Text>
                <Text className="text-white font-bold mb-10" style={{ fontSize: scaleFont(24) }}>Sign In</Text>

                {error ? (
                    <View className="bg-red-500/20 border-2 border-red-500 rounded-2xl p-4 mb-6">
                        <Text className="text-red-200 text-sm font-semibold">❌ {error}</Text>
                    </View>
                ) : null}

                {success ? (
                    <View className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-4 mb-6">
                        <Text className="text-green-200 text-sm font-semibold">✅ {success}</Text>
                    </View>
                ) : null}

                <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        setError("");
                    }}
                    type="email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                />

                <Input
                    placeholder="Password"
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        setError("");
                    }}
                    type="password"
                    className="mb-6"
                    editable={!loading}
                />

                <View className="flex-row items-center my-6">
                    <View className="flex-1 h-[1px] bg-white" />
                    <Text className="text-white text-xs font-bold mx-3 opacity-60">
                        OR SIGN IN WITH
                    </Text>
                    <View className="flex-1 h-[1px] bg-white" />
                </View>

                <TouchableOpacity 
                    className="border-2 border-white rounded-full py-3.5 mb-4 flex-row items-center justify-center"
                    disabled={loading || !request}
                    onPress={() => promptAsync()}
                >
                    <View className="w-5 h-5 mr-2">
                        <View className="absolute w-2 h-2 top-0 left-0 bg-[#EA4335]" />
                        <View className="absolute w-2 h-2 top-0 right-0 bg-[#4285F4]" />
                        <View className="absolute w-2 h-2 bottom-0 left-0 bg-[#FBBC05]" />
                        <View className="absolute w-2 h-2 bottom-0 right-0 bg-[#34A853]" />
                    </View>
                    <Text className="text-white text-sm font-semibold">GOOGLE</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    className="bg-white rounded-full py-4 mb-6 items-center"
                    onPress={handleLogIn}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#111827" />
                    ) : (
                        <Text className="text-gray-900 text-sm font-semibold">SIGN IN</Text>
                    )}
                </TouchableOpacity>

                <Text className="text-white text-sm text-center font-medium">
                    DON'T HAVE AN ACCOUNT?{" "}
                    <Text 
                        className="text-blue-500 font-semibold"
                        onPress={() => !loading && router.push("/screens/auth/SignupScreen")}
                    >
                        SIGN UP
                    </Text>
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}