import "global.css"
import React, { useEffect } from "react"
import { useFonts } from 'expo-font'
import { Stack } from "expo-router"
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { notificationService } from "./services/notificationService"

export default function RootLayout() {
  const [loaded] = useFonts({
    "WixMadeforText-Regular": require("./assets/fonts/WixMadeforText-VariableFont_wght.ttf"),
    "WixMadeforText-Italic": require("./assets/fonts/WixMadeforText-Italic-VariableFont_wght.ttf")
  })

  useEffect(() => {
    const setupNotifications = async () => {
      const granted = await notificationService.requestPermissions()
      if (granted) {
        console.log('📱 Push notifications ready!')
      }
    }
    
    setupNotifications()
  }, [])

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <View className="flex-1 font-wix">
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </SafeAreaProvider>
  );
}
