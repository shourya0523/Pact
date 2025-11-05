import React, { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function EntryScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/screens/auth/WelcomeScreen');  // Changed to WelcomeScreen
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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

      <View className="flex-1 items-center justify-center">
        <Image
          source={require('../../images/space/logo.png')}
          className="w-32 h-32 mb-4"
          resizeMode="contain"
        />
        
        <Text className="text-white text-6xl font-bold">
          Pact
        </Text>
      </View>
    </View>
  );
}
