import React from 'react';
import { View, StyleSheet } from 'react-native';
import NavBar from './NavBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Whether to show the navbar */
  showNavBar?: boolean;
  /** Custom navbar background color */
  navbarBackgroundColor?: string;
}

/**
 * Standardized layout wrapper for dashboard screens
 * Provides consistent navigation bar across all dashboard screens
 */
export default function DashboardLayout({ 
  children, 
  showNavBar = true,
  navbarBackgroundColor 
}: DashboardLayoutProps) {
  return (
    <View style={styles.container}>
      {children}
      {showNavBar && <NavBar backgroundColor={navbarBackgroundColor} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});

