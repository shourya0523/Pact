import React, { useState } from "react";
import { Text, TouchableOpacity, ScrollView, View, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getBaseUrl } from "../../../config";
import WhiteParticles from "app/components/space/whiteStarsParticlesBackground";
import Input from "../../components/common/Text-input";

export default function SignupScreen() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSignup = async () => {
        setError("");
        setSuccess("");

        if (!username.trim() || !email.trim() || !password.trim()) {
            setError("Please fill out all fields to continue.");
            return;
        }

        if (username.trim().length < 3) {
            setError("Username must be at least 3 characters long.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError("Please enter a valid email address.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setLoading(true);
        
        try {
            const BASE_URL = await getBaseUrl();
            
            const payload = {
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password: password
            };
            
            const response = await fetch(`${BASE_URL}/api/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess("Account created successfully! Redirecting to login...");
                
                setTimeout(() => {
                    router.push("/screens/auth/LoginScreen");
                }, 1500);
            } else {
                let errorMessage = "Unable to create account. Please try again.";
                
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
                
                setError(`Signup Failed: ${errorMessage}`);
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
        <View className="flex-1 bg-[#291133]">
            <WhiteParticles />
            <ScrollView 
                className="flex-1 px-6"
                contentContainerStyle={{ paddingTop: 200, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-white text-4xl font-semibold mb-2 leading-tight">
                    Create Your{'\n'}Account
                </Text>

                {error ? (
                    <View className="bg-red-500/20 border-2 border-red-500 rounded-2xl p-4 mb-6 mt-4">
                        <Text className="text-red-200 text-sm font-semibold">❌ {error}</Text>
                    </View>
                ) : null}

                {success ? (
                    <View className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-4 mb-6 mt-4">
                        <Text className="text-green-200 text-sm font-semibold">✅ {success}</Text>
                    </View>
                ) : null}

                <Input
                    placeholder="Username"
                    value={username}
                    onChangeText={(text) => {
                        setUsername(text);
                        setError(""); 
                    }}
                    type="text"
                    autoCapitalize="none"
                    editable={!loading}
                />

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
                    editable={!loading}
                />

                <View className="flex-row items-center my-6">
                    <View className="flex-1 h-[1px] bg-white" />
                    <Text className="text-white text-xs font-bold mx-3 opacity-60">
                        OR SIGN UP WITH
                    </Text>
                    <View className="flex-1 h-[1px] bg-white" />
                </View>

                <TouchableOpacity 
                    className="border-2 border-white rounded-full py-3.5 mb-4 flex-row items-center justify-center"
                    disabled={loading}
                    onPress={() => setError("Google Sign-Up coming soon!")}
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
                    onPress={handleSignup}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#111827" />
                    ) : (
                        <Text className="text-gray-900 text-sm font-semibold">NEXT</Text>
                    )}
                </TouchableOpacity>

                <Text className="text-white text-sm text-center font-medium">
                    ALREADY HAVE AN ACCOUNT?{" "}
                    <Text 
                        className="text-blue-500 font-semibold"
                        onPress={() => !loading && router.push("/screens/auth/LoginScreen")}
                    >
                        SIGN IN
                    </Text>
                </Text>
            </ScrollView>
        </View>
    );
}