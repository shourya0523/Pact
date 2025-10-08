// Welcome screen file
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../assets/theme";
import { useRouter } from "expo-router";

export default function Index() {
    const router = useRouter();
    
  return (
    <LinearGradient
      colors={[theme.colors.backgroundGradientStart, theme.colors.backgroundGradientEnd]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      style={styles.container}
    >
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>Logo</Text>
      </View>
      <Text style={styles.title}>PACT</Text>
      
      <TouchableOpacity style={styles.continueButton} activeOpacity={0.8} onPress={() => router.push("/screens/auth/LoginScreen")}>

        <Text style={styles.continueText}>Continue →</Text>

      </TouchableOpacity>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  
  logoCircle: {
    width: theme.sizes.logoSize,
    height: theme.sizes.logoSize,
    borderRadius: theme.sizes.logoSize / 2,
    backgroundColor: theme.colors.logoCircle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.sizes.spacing * 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },

  logoText: {
    fontSize: 14,
    color: theme.colors.text,
  },

  title: {
    fontSize: 72,
    color: theme.colors.text,
    fontWeight: "700",
    letterSpacing: 4,
  },

  continueButton: {
    // marginTop: 48,
    // borderWidth: 1,
    // borderColor: "rgba(255, 255, 255, 0.6)",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 10,
    shadowColor: "transparent",
  },

  continueGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 30,
  },

  continueText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  }
})
