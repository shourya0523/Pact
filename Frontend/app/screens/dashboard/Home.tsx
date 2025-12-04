import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, ScrollView, RefreshControl, Alert, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from "../../../config";
import HomeUI from "../../components/common/ui/home-ui";
import HabitSelect from "../../components/common/ui/habitSelect";
import ProgressCheck from "../../components/common/ui/progressCheck";
import PurpleParticles from "../../components/space/purpleStarsParticlesBackground";
import StreakIndicator from "../../components/habit/StreakIndicator";
import SearchPartnerPopup from '@/components/popups/search-partner';  // Add this import at top

interface DashboardData {
  user: {
    display_name: string;
    username: string;
  };
  streaks: Array<{
    habit_id: string;
    habit_name: string;
    current_streak: number;
    category: string;
  }>;
  todays_goals: Array<{
    habit_id: string;
    habit_name: string;
    checked_in_today: boolean;
    category: string;
  }>;
  partner_progress: Array<{
    partner_name: string;
    habit_name: string;
    checked_in_at: string;
    hours_ago: number;
  }>;
  partnership: {
    partner_name: string;
    partner_username: string;
    total_active_habits: number;
  } | null;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [searchPartnerVisible, setSearchPartnerVisible] = useState(false);


  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        Alert.alert("Not Authenticated", "Please log in again.");
        router.replace("/screens/auth/LoginScreen");
        return;
      }

      const BASE_URL = await getBaseUrl();
      const response = await fetch(`${BASE_URL}/api/dashboard/home`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        await AsyncStorage.clear();
        Alert.alert("Session Expired", "Please log in again.");
        router.replace("/screens/auth/LoginScreen");
        return;
      }

      if (response.status === 404) {
        const userData = await AsyncStorage.getItem('user_data');
        const user = userData ? JSON.parse(userData) : null;
        
        setDashboardData({
          user: {
            display_name: user?.display_name || user?.username || 'User',
            username: user?.username || 'user'
          },
          streaks: [],
          todays_goals: [],
          partner_progress: [],
          partnership: null
        });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      
      const userData = await AsyncStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;
      
      setDashboardData({
        user: {
          display_name: user?.display_name || user?.username || 'User',
          username: user?.username || 'user'
        },
        streaks: [],
        todays_goals: [],
        partner_progress: [],
        partnership: null
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleCheckIn = async (habitId: string, habitName: string, currentStatus: boolean) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        Alert.alert("Not Authenticated", "Please log in again.");
        return;
      }

      const BASE_URL = await getBaseUrl();
      const response = await fetch(`${BASE_URL}/api/habits/${habitId}/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to check in');
      }

      fetchDashboardData();
      
    } catch (err: any) {
      console.error('Check-in error:', err);
      Alert.alert("Check-in Failed", "Unable to check in. Please try again.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <PurpleParticles />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4">Loading Dashboard...</Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <PurpleParticles />
        <Text className="text-white text-xl mb-4">⚠️ Failed to load dashboard</Text>
        <TouchableOpacity onPress={() => fetchDashboardData()}>
          <Text className="text-blue-400 text-lg underline">Tap to Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const goals = dashboardData.todays_goals.map(goal => ({
    id: goal.habit_id,
    name: goal.habit_name,
    checked: goal.checked_in_today
  }));

   return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
      >
        <View className="flex-1 relative">
          <PurpleParticles />
          
          <Image
            source={require("../../images/space/nebula.png")}
            className="absolute top-0 left-0"
            style={{ width: 500, height: 420 }}
            resizeMode="cover"
          />

          <View className="w-full bg-white/10 pt-12 pb-6 px-6">
            <Text className="text-white text-[36px] font-wix">
              Hello, {dashboardData.user.display_name || dashboardData.user.username}!
            </Text>
          </View>

          <View className="mt-6 px-6">
            <Text className="text-white text-[28px] font-semibold mb-1">Streaks</Text>
            <View className="h-[1px] mb-2 bg-white" />
            
            {dashboardData.streaks.length > 0 ? (
              dashboardData.streaks.map((item) => (
                <View key={item.habit_id} className="flex-row justify-between mb-2">
                  <Text className="text-white text-[18px] ml-2">{item.habit_name}</Text>
                  <StreakIndicator currentStreak={item.current_streak} isActive={true} />
                </View>
              ))
            ) : (
              <View className="py-4">
                <Text className="text-white/60 text-center">No active streaks yet</Text>
                <Text className="text-white/40 text-sm text-center mt-1">
                  Start checking in to build streaks!
                </Text>
              </View>
            )}
          </View>

          <View className="mt-8 px-6">
            <Text className="text-white text-[28px] font-semibold">Check In</Text>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-[22px]">Today's Goals</Text>
              <TouchableOpacity onPress={() => router.push('/screens/dashboard/HabitViews')}>
                <Text className="text-gray-300 text-xs">View All</Text>
              </TouchableOpacity>
            </View>
            
            {dashboardData.todays_goals.length > 0 ? (
              <HabitSelect
                habits={goals}
                onPress={(habit) => {
                  const goal = dashboardData.todays_goals.find(g => g.habit_id === habit.id);
                  if (goal) {
                    handleCheckIn(habit.id, habit.name, goal.checked_in_today);
                  }
                }}
              />
            ) : (
              <View className="bg-white/10 rounded-2xl p-6 items-center">
                <Text className="text-white/60">No goals for today</Text>
                <Text className="text-white/40 text-sm mt-2">Create a habit to get started!</Text>
              </View>
            )}
          </View>

          <View className="mt-8 px-6 mb-20">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-[28px] font-semibold">Partner Progress</Text>
              <TouchableOpacity onPress={() => router.push('/screens/dashboard/ViewAllPartnerships')}>
                <Text className="text-gray-300 text-xs">View All</Text>
              </TouchableOpacity>
            </View>
    
            {dashboardData.partner_progress.length > 0 ? (
              dashboardData.partner_progress.map((activity, index) => (
                <ProgressCheck 
                  key={index} 
                  text={`${activity.partner_name} checked in for ${activity.habit_name}!`}
                />
              ))
            ) : dashboardData.partnership ? (
                <View className="bg-white/10 rounded-2xl p-6 items-center">
                  <Text className="text-white/60">No recent partner activity</Text>
                  <Text className="text-white/40 text-sm mt-1">
                    Your partner hasn't checked in yet today
                  </Text>
                </View>
            ) : (
                <View className="bg-purple-600/30 rounded-2xl p-6 border-2 border-purple-400/50">
                  <Text className="text-white text-lg font-bold mb-2">🤝 No Partner Yet</Text>
                  <Text className="text-white/80 mb-4">
                    Invite a friend to start tracking habits together!
                  </Text>
                  <TouchableOpacity 
                    className="bg-white rounded-full py-3 px-6 self-start"
                    onPress={() => setSearchPartnerVisible(true)}
                  >
                    <Text className="text-purple-900 font-semibold">Invite Partner</Text>
                  </TouchableOpacity>

                  <SearchPartnerPopup
                    visible={searchPartnerVisible}
                    onClose={() => setSearchPartnerVisible(false)}
                  />
                </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      <HomeUI />
    </View>
  );
}