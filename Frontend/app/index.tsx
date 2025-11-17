import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Image } from "react-native";
import { Redirect } from "expo-router";
import { validateToken } from "./utils/authUtils";

/**
 * Root index component that handles authentication routing
 * - Validates token with backend
 * - Redirects to dashboard if authenticated
 * - Redirects to welcome screen if not authenticated
 */
export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsValidating(true);
        const isValid = await validateToken();
        setIsAuthenticated(isValid);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsValidating(false);
      }
    };

    checkAuth();
  }, []);

  // Show improved loading screen while validating
  if (isValidating) {
    return (
      <View className="flex-1 bg-[#291133]">
        {/* Stars background */}
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

        {/* Loading content */}
        <View className="flex-1 items-center justify-center">
          <Image
            source={require("./images/space/logo.png")}
            className="w-32 h-32 mb-4"
            resizeMode="contain"
          />
          
          <Text className="text-white text-6xl font-bold mb-8">
            Pact
          </Text>

          <ActivityIndicator size="large" color="#FFFFFF" />
          
          <Text className="text-white/70 text-sm mt-6 font-medium">
            Checking authentication...
          </Text>
        </View>
      </View>
    );
  }

  // Redirect based on authentication status
  if (isAuthenticated) {
    return <Redirect href="/screens/dashboard/Home" />;
  }

  return <Redirect href="/screens/auth/WelcomeScreen" />;
}