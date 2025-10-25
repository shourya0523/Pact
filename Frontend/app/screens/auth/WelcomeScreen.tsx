import React from "react";
import { Text, Image, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
    const router = useRouter();

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

                <TouchableOpacity 
                    className="w-full py-5 bg-[#81849845] rounded-full items-center"
                    activeOpacity={0.27}
                    onPress={() => router.push("/screens/auth/GetStarted")}
                >
                    <Text className="text-white text-lg font-semibold tracking-wide">
                        GET STARTED
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}