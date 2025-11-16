import React, { useState } from "react";
// testing testing
import { Text, TouchableOpacity, ScrollView, View, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { getBaseUrl } from "../../../config";
import Input from "../../components/common/Text-input";

export default function SignupScreen() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSignup = async () => {
        const BASE_URL = await getBaseUrl();
        if (!username || !email || !password) {
            Alert.alert("Missing fields", "Please fill out all fields.");
            return;
        }

        if (password.length < 8) {
            Alert.alert("Password too short", "Password must be longer than 8 characters.")
            return;
        }

        console.log({ username, email, password });
        
        try {
            const response = await fetch(`${BASE_URL}/auth/signup`, {
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
                // Store the access token if returned (optional)
                // await AsyncStorage.setItem('access_token', data.access_token);
                
                Alert.alert(
                    "Success!",
                    "Account created successfully!",
                    [
                        {
                            text: "OK",
                            onPress: () => router.replace("/screens/auth/GetStarted")
                        }
                    ]
                );
            } else {
                Alert.alert("Signup failed", data.detail || "Error creating account");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Network error", "Could not connect to server");
        }
    }

    return (
        <View className="flex-1 bg-[#291133]">
            <Image
                source={require('../../images/space/moon.png')}
                className="absolute w-100 h-100 -top-10 -right-10"
                resizeMode="contain"
            />

            <ScrollView 
                className="flex-1 px-6"
                contentContainerStyle={{ paddingTop: 150, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-white text-4xl font-semibold mb-2 leading-tight">
                    Create your{'\n'}account
                </Text>
                <Text className="text-white text-2xl font-bold mb-10">Sign Up</Text>

                <Input
                    placeholder="Username"
                    value={username}
                    onChangeText={setUsername}
                    type="text"
                />

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
                        OR SIGN UP WITH
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
                    onPress={handleSignup}
                >
                    <Text className="text-gray-900 text-sm font-semibold">NEXT</Text>
                </TouchableOpacity>

                <Text className="text-white text-sm text-center font-medium">
                    ALREADY HAVE AN ACCOUNT?{" "}
                    <Text 
                        className="text-blue-500 font-semibold"
                        onPress={() => router.push("/screens/auth/LoginScreen")}
                    >
                        SIGN IN
                    </Text>
                </Text>
            </ScrollView>
        </View>
    )
}