import "global.css"
import React, { useEffect } from "react"
import { useFonts } from 'expo-font'
import { Stack } from "expo-router"
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { notificationService } from "./services/notificationService"
import { websocketService } from "./services/websocketService"
import { getUserData } from "./utils/authUtils"
import { TutorialProvider } from "./contexts/TutorialContext"
import TutorialManager from "./components/tutorial/TutorialManager"

export default function RootLayout() {
  const [loaded] = useFonts({
    "WixMadeforText-Regular": require("./assets/fonts/WixMadeforText-VariableFont_wght.ttf"),
    "WixMadeforText-Italic": require("./assets/fonts/WixMadeforText-Italic-VariableFont_wght.ttf")
  })

  useEffect(() => {
    const setupNotifications = async () => {
      // Request push notification permissions
      const granted = await notificationService.requestPermissions()
      if (granted) {
        console.log('📱 Push notifications ready!')
      }

      // Connect WebSocket if user is logged in
      try {
        const userData = await getUserData()
        if (userData && userData.id) {
          console.log('🔌 Connecting WebSocket for user:', userData.id)
          await websocketService.connect(userData.id)
        }
      } catch (error) {
        console.error('Error connecting WebSocket:', error)
      }
    }
    
    setupNotifications()

    // Cleanup on unmount
    return () => {
      websocketService.disconnect()
    }
  }, [])

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <TutorialProvider>
        <View className="flex-1 font-wix">
          <Stack screenOptions={{ headerShown: false }} />
          <TutorialManager />
        </View>
      </TutorialProvider>
    </SafeAreaProvider>
  );
}
