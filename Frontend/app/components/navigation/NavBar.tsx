import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, Platform, Dimensions, Animated } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NAV_ITEMS, isRouteActive } from '../../navigation/config';
import { notificationAPI } from '../../services/notificationAPI';
import { scaleSize } from '@/utils/constants';

interface NavBarProps {
  /** Whether to show labels under icons */
  showLabels?: boolean;
  /** Custom background color */
  backgroundColor?: string;
}

export default function NavBar({ showLabels = false, backgroundColor }: NavBarProps) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const screenWidth = Dimensions.get('window').width;
  const maxWidth = isWeb ? 1200 : screenWidth;
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);

  // Desktop-specific sizing
  const iconSize = isWeb ? 24 : scaleSize(24);
  const labelFontSize = isWeb ? 10 : scaleSize(10);
  const paddingVertical = isWeb ? 12 : scaleSize(10);
  const paddingBottom = isWeb ? Math.max(insets.bottom, 12) : Math.max(insets.bottom, scaleSize(12));
  const paddingHorizontal = isWeb ? 0 : scaleSize(4);

  // Construct current path from segments
  const currentPath = '/' + segments.join('/');

  useEffect(() => {
    // Determine active route
    const currentActive = NAV_ITEMS.find(item => isRouteActive(item.route, currentPath));
    setActiveRoute(currentActive?.id || null);

    // Load unread notification count
    loadUnreadCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [currentPath]);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleNavigation = (route: string, itemId: string) => {
    // Don't navigate if already on this route
    if (activeRoute === itemId) return;
    
    router.push(route as any);
    
    // Refresh notification count after navigation if going to notifications
    if (itemId === 'notifications') {
      setTimeout(loadUnreadCount, 500);
    }
  };

  const bgColor = backgroundColor || 'rgba(41, 17, 51, 0.95)'; // #291133 with opacity

  return (
    <View
      className="absolute bottom-0 w-full flex-row justify-around items-center z-50"
      style={{
        maxWidth: isWeb ? maxWidth : '100%',
        alignSelf: isWeb ? 'center' : 'stretch',
        paddingBottom,
        paddingTop: paddingVertical,
        paddingHorizontal,
        backgroundColor: bgColor,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeRoute === item.id;
        const iconName = isActive && item.iconActive ? item.iconActive : item.icon;
        const iconColor = isActive ? '#A855F7' : 'rgba(255, 255, 255, 0.6)';
        
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleNavigation(item.route, item.id)}
            activeOpacity={0.7}
            className="items-center justify-center"
            style={{
              flex: 1,
              paddingVertical: showLabels ? scaleSize(4) : 0,
            }}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons
                name={iconName}
                size={iconSize}
                color={iconColor}
              />
              
              {/* Active indicator dot */}
              {isActive && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    left: '50%',
                    marginLeft: -3,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#A855F7',
                  }}
                />
              )}
              
              {/* Notification badge */}
              {item.id === 'notifications' && unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    backgroundColor: '#ef4444',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    paddingHorizontal: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: bgColor,
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Label */}
            {showLabels && (
              <Text
                style={{
                  color: iconColor,
                  fontSize: labelFontSize,
                  fontWeight: isActive ? '600' : '400',
                  marginTop: scaleSize(4),
                }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

