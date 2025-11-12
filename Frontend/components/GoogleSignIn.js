// components/GoogleSignIn.js
import React, { useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const GoogleSignIn = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  /**
   * Google Authentication Setup
   * - currently in testing mode
   * - Team members need to be added as test users in Google Cloud Console
   * - Contact Audrey to be added as a test user - The cloud is all under my Gmail right now
   */
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '1038322012717-h1iqh7jv8s3pb6q6dm85390po4eamlso.apps.googleusercontent.com',
    iosClientId: '1038322012717-hnel4l1370fh5tam9ccovut6av4clrik.apps.googleusercontent.com',
    webClientId: '1038322012717-73h7qf0ba1qmtefufbd4v4hea4ggrv9t.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      getUserInfo(response.authentication.accessToken);
    }
  }, [response]);

  const getUserInfo = async (token) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const user = await response.json();
      console.log('User info:', user);
      setUserInfo(user);

      // Sending to backend
      await sendToBackend(token, user);

    } catch (error) {
      console.error('Error getting user info:', error);
      Alert.alert('Error', 'Failed to get user information');
    } finally {
      setLoading(false);
    }
  };

  const sendToBackend = async (accessToken, user) => {
    try {
      // TODO: Replace with actual backend URL
      // this will fail but won't break the app
      const response = await fetch('http://localhost:8080/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: accessToken,
          user: user,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Signed in successfully!');
      }
    } catch (error) {
      console.error('Backend error:', error);
      // Don't show alert here since backend might not be ready yet
    }
  };

  const signOut = () => {
    setUserInfo(null);
    Alert.alert('Signed Out', 'You have been signed out');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Signing in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pact</Text>

      {userInfo ? (
        <View style={styles.userInfo}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.text}>Name: {userInfo.name}</Text>
          <Text style={styles.text}>Email: {userInfo.email}</Text>
          <View style={styles.buttonContainer}>
            <Button title="Sign Out" onPress={signOut} color="#DB4437" />
          </View>
        </View>
      ) : (
        <View style={styles.signInContainer}>
          <Text style={styles.subtitle}>Sign in to continue</Text>
          <View style={styles.buttonContainer}>
            <Button
              title="Sign in with Google"
              disabled={!request}
              onPress={() => promptAsync()}
              color="#4285F4"
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  signInContainer: {
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  buttonContainer: {
    marginTop: 20,
    width: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default GoogleSignIn;