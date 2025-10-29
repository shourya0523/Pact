import "global.css"
import React from "react"
import { useFonts } from 'expo-font'
import { Stack } from "expo-router"
import { View } from 'react-native'

export default function RootLayout() {
  const [loaded] = useFonts({
    "WixMadeforText-Regular": require("./assets/fonts/WixMadeforText-VariableFont_wght.ttf"),
    "WixMadeforText-Italic": require("./assets/fonts/WixMadeforText-Italic-VariableFont_wght.ttf")
  })

  if (!loaded) return null;

  return (
    <View className="flex-1 font-wix">
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
