// Login screen (can also be a modal)
import React, { useState } from "react";
import { Text, TouchableOpacity, ScrollView, View, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { getBaseUrl } from "../../../config";
import Input from "../../components/common/Text-input";

export default function LoginScreen() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogIn = async () => {
        const BASE_URL = await getBaseUrl();
        try {
            const response = await fetch(`${BASE_URL}/auth/login`, {
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
        <View className="flex-1 bg-[#291133]">
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
                    Welcome{'\n'}Back!
                </Text>
                <Text className="text-white text-2xl font-bold mb-10">Sign In</Text>


                <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    type="email"
                />

                <Input
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    type="password"
                    className="mb-6"
                />

                <View className="flex-row items-center my-6">
                    <View className="flex-1 h-[1px] bg-white" />
                    <Text className="text-white text-xs font-bold mx-3 opacity-60">
                        OR SIGN IN WITH
                    </Text>
                    <View className="flex-1 h-[1px] bg-white" />
                </View>

                <TouchableOpacity className="border-2 border-white rounded-full py-3.5 mb-4 flex-row items-center justify-center">
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
                >
                    <Text className="text-gray-900 text-sm font-semibold">SIGN IN</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    )
}