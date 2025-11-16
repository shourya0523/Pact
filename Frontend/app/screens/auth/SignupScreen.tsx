import React, { useState } from "react";
import { Text, TouchableOpacity, ScrollView, View, Alert, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getBaseUrl } from "../../../config";
import Input from "../../components/common/Text-input";

export default function SignupScreen() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        // Validation
        if (!username || !email || !password) {
            Alert.alert("Missing fields", "Please fill out all fields.");
            return;
        }

        if (username.length < 3) {
            Alert.alert("Username too short", "Username must be at least 3 characters.");
            return;
        }

        if (password.length < 8) {
            Alert.alert("Password too short", "Password must be at least 8 characters.");
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert("Invalid email", "Please enter a valid email address.");
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
            
            console.log("Signup payload:", payload);
            console.log("API URL:", `${BASE_URL}/api/auth/signup`);
            
            const response = await fetch(`${BASE_URL}/api/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert(
                    "Success", 
                    "Account created successfully! Please log in to continue.",
                    [{
                        text: "OK",
                        onPress: () => router.push("/screens/auth/LoginScreen")
                    }]
                );
            } else {
                // Log the full error for debugging
                console.error("Signup failed:", data);
                
                // Show detailed error message
                let errorMessage = "An error occurred during signup.";
                if (data.detail) {
                    if (typeof data.detail === 'string') {
                        errorMessage = data.detail;
                    } else if (Array.isArray(data.detail)) {
                        // Pydantic validation errors come as array
                        errorMessage = data.detail.map((err: any) => 
                            `${err.loc.join('.')}: ${err.msg}`
                        ).join('\n');
                    }
                }
                
                Alert.alert("Signup Failed", errorMessage);
            }
        } catch (error) {
            console.error("Signup error:", error);
            Alert.alert("Network Error", "Unable to connect. Please check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#291133]">
            {/* Star field background */}
            <View className="absolute inset-0">
                {[...Array(50)].map((_, i) => (
                    <View
                        key={i}
                        className="absolute bg-white rounded-full"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            width: Math.random() * 3 + 1,
                            height: Math.random() * 3 + 1,
                            opacity: Math.random() * 0.7 + 0.3,
                        }}
                    />
                ))}
            </View>
            
            {/* Moon image */}
            <Image
                source={require('../../images/space/moon.png')}
                className="absolute w-150 h-150 -top-32 -right-20"
                resizeMode="contain"
            />

            <ScrollView 
                className="flex-1 px-6"
                contentContainerStyle={{ paddingTop: 200, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-white text-4xl font-semibold mb-2 leading-tight">
                    Create Your{'\n'}Account
                </Text>

                <Input
                    placeholder="Username"
                    value={username}
                    onChangeText={setUsername}
                    type="text"
                    autoCapitalize="none"
                    editable={!loading}
                />

                <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    type="email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                />

                <Input
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
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