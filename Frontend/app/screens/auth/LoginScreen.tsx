import React, { useState } from "react";
import { Text, TouchableOpacity, ScrollView, View, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getBaseUrl } from "../../../config";
import Input from "../../components/common/Text-input";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogIn = async () => {
        if (!email || !password) {
            Alert.alert("Missing fields", "Please enter your email and password.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert("Invalid email", "Please enter a valid email address.");
            return;
        }

        setLoading(true);
        
        try {
            const BASE_URL = await getBaseUrl();
            
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
                await AsyncStorage.setItem('access_token', data.access_token);
                await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

                console.log("✅ Login successful:", data.user);
                
                // Redirect to Home page
                router.replace("/screens/dashboard/Home");
            } else {
                Alert.alert("Login Failed", data.detail || "Please check your credentials.");
            }
        } catch (error) {
            console.error("Login error:", error);
            Alert.alert("Network Error", "Unable to connect. Please check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#291133]">
            <ScrollView 
                className="flex-1 px-6"
                contentContainerStyle={{ paddingTop: 60, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
            >
                <Text className="text-white text-3xl font-bold text-center mb-2">PACT</Text>
                <Text className="text-white text-2xl font-bold mb-10">Sign In</Text>

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
        </View>
    );
}