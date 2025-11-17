import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, TextInput } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getToken, 
  storeToken, 
  removeToken, 
  getUserData, 
  storeUserData, 
  clearAuthData,
  validateToken,
  getCurrentUser
} from "../../utils/authUtils";
import { getBaseUrl } from "../../../config";

export default function AuthTestScreen() {
  const [results, setResults] = useState<string[]>([]);
  const [storageState, setStorageState] = useState<any>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");

  const addResult = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? "❌" : "✅";
    setResults(prev => [`[${timestamp}] ${prefix} ${message}`, ...prev]);
  };

  const checkStorage = async () => {
    try {
      const token = await getToken();
      const user = await getUserData();
      const state = {
        token: token ? `Exists (${token.substring(0, 20)}...)` : "Missing",
        user: user ? JSON.stringify(user, null, 2) : "Missing"
      };
      setStorageState(state);
      addResult(`Storage check complete`);
      return state;
    } catch (error: any) {
      addResult(`Storage check failed: ${error.message}`, true);
    }
  };

  const test1_NoToken = async () => {
    addResult("Test 1: No Token - Starting...");
    try {
      await clearAuthData();
      addResult("Cleared all auth data");
      
      const isValid = await validateToken();
      addResult(`Validation result: ${isValid ? "Valid" : "Invalid"} (Expected: Invalid)`);
      
      if (!isValid) {
        addResult("✅ Test 1 PASSED: No token correctly identified");
      } else {
        addResult("❌ Test 1 FAILED: Should return false for no token", true);
      }
    } catch (error: any) {
      addResult(`Test 1 ERROR: ${error.message}`, true);
    }
  };

  const test2_ValidToken = async () => {
    addResult("Test 2: Valid Token - Starting...");
    try {
      if (!testEmail || !testPassword) {
        addResult("❌ Test 2 SKIPPED: Enter email and password above first", true);
        return;
      }

      // First, login to get a valid token
      const BASE_URL = await getBaseUrl();
      addResult("Attempting login to get valid token...");

      try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail.trim(), password: testPassword })
        });

        const data = await response.json();

        if (response.ok) {
          await storeToken(data.access_token);
          await storeUserData(data.user);
          addResult("Login successful, token stored");

          // Now test validation
          const isValid = await validateToken();
          addResult(`Validation result: ${isValid ? "Valid" : "Invalid"} (Expected: Valid)`);

          if (isValid) {
            addResult("✅ Test 2 PASSED: Valid token correctly validated");
          } else {
            addResult("❌ Test 2 FAILED: Valid token should return true", true);
          }
        } else {
          addResult(`Login failed: ${data.detail || "Unknown error"}`, true);
        }
      } catch (error: any) {
        addResult(`Test 2 ERROR: ${error.message}`, true);
      }
    } catch (error: any) {
      addResult(`Test 2 ERROR: ${error.message}`, true);
    }
  };

  const test3_InvalidToken = async () => {
    addResult("Test 3: Invalid Token (401) - Starting...");
    try {
      // Set a fake token
      await storeToken("fake_invalid_token_12345");
      addResult("Set fake token");

      const isValid = await validateToken();
      addResult(`Validation result: ${isValid ? "Valid" : "Invalid"} (Expected: Invalid)`);

      // Check if token was cleared
      const tokenAfter = await getToken();
      if (!tokenAfter) {
        addResult("✅ Token was cleared after 401");
        addResult("✅ Test 3 PASSED: Invalid token detected and cleared");
      } else {
        addResult("❌ Test 3 FAILED: Token should be cleared after 401", true);
      }
    } catch (error: any) {
      addResult(`Test 3 ERROR: ${error.message}`, true);
    }
  };

  const test4_NetworkError = async () => {
    addResult("Test 4: Network Error Handling - Starting...");
    try {
      // Store a valid-looking token first
      await storeToken("test_token_for_network_error");
      addResult("Set test token");

      // Stop backend or use invalid URL to simulate network error
      // For this test, we'll manually check if token persists
      addResult("⚠️  Manual test: Stop backend server, then reload app");
      addResult("⚠️  Token should NOT be cleared on network errors");
      addResult("⚠️  Test 4 requires manual verification");
    } catch (error: any) {
      addResult(`Test 4 ERROR: ${error.message}`, true);
    }
  };

  const test5_StorageKeys = async () => {
    addResult("Test 5: Storage Key Verification - Starting...");
    try {
      await clearAuthData();
      await storeToken("test_token_123");
      await storeUserData({ id: "123", username: "test", email: "test@test.com" });

      // Check what keys exist
      const allKeys = await AsyncStorage.getAllKeys();
      addResult(`All storage keys: ${allKeys.join(", ")}`);

      const hasAccessToken = allKeys.includes("access_token");
      const hasUserData = allKeys.includes("user_data");
      const hasOldKey = allKeys.includes("@pact_auth_token");

      if (hasAccessToken && !hasOldKey) {
        addResult("✅ Test 5 PASSED: Using correct key 'access_token'");
      } else {
        addResult("❌ Test 5 FAILED: Wrong storage keys", true);
      }

      if (hasUserData) {
        addResult("✅ User data key 'user_data' exists");
      }
    } catch (error: any) {
      addResult(`Test 5 ERROR: ${error.message}`, true);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    addResult("🚀 Starting all tests...");
    
    await test5_StorageKeys();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await test1_NoToken();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // test2 requires user input, so we'll skip it in auto-run
    addResult("⚠️  Test 2 skipped (requires login) - run manually");
    
    await test3_InvalidToken();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    test4_NetworkError();
    
    addResult("✅ All automated tests complete!");
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Auth Tests (Items 1 & 2)</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Test Credentials (for Test 2):</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={testEmail}
            onChangeText={setTestEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={testPassword}
            onChangeText={setTestPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={checkStorage}>
            <Text style={styles.buttonText}>Check Storage</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={test1_NoToken}>
            <Text style={styles.buttonText}>Test 1: No Token</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={test2_ValidToken}>
            <Text style={styles.buttonText}>Test 2: Valid Token</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={test3_InvalidToken}>
            <Text style={styles.buttonText}>Test 3: Invalid Token</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={test4_NetworkError}>
            <Text style={styles.buttonText}>Test 4: Network Error</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={test5_StorageKeys}>
            <Text style={styles.buttonText}>Test 5: Storage Keys</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.runAllButton]} onPress={runAllTests}>
            <Text style={styles.buttonText}>🚀 Run All Tests</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.clearButton]} 
            onPress={async () => {
              await clearAuthData();
              setResults([]);
              setStorageState(null);
              addResult("Storage cleared");
            }}
          >
            <Text style={styles.buttonText}>Clear All Storage</Text>
          </TouchableOpacity>
        </View>

        {storageState && (
          <View style={styles.storageBox}>
            <Text style={styles.storageTitle}>Current Storage State:</Text>
            <Text style={styles.storageText}>Token: {storageState.token}</Text>
            <Text style={styles.storageText}>User: {storageState.user}</Text>
          </View>
        )}

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {results.map((result, index) => (
            <Text 
              key={index} 
              style={[
                styles.resultText,
                result.includes("❌") && styles.errorText,
                result.includes("✅") && styles.successText
              ]}
            >
              {result}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#291133",
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#835994",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  runAllButton: {
    backgroundColor: "#34A853",
    marginTop: 10,
  },
  clearButton: {
    backgroundColor: "#EA4335",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  storageBox: {
    backgroundColor: "#1a0d22",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#835994",
  },
  storageTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  storageText: {
    color: "#CCCCCC",
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 5,
  },
  resultsContainer: {
    backgroundColor: "#1a0d22",
    padding: 15,
    borderRadius: 10,
    minHeight: 200,
  },
  resultsTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  resultText: {
    color: "#CCCCCC",
    fontSize: 12,
    marginBottom: 5,
    fontFamily: "monospace",
  },
  errorText: {
    color: "#FF6B6B",
  },
  successText: {
    color: "#51CF66",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a0d22",
    color: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#835994",
  },
});

