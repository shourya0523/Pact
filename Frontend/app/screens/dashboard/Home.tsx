import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { View, Text, Image, ActivityIndicator, ScrollView, RefreshControl, Alert, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../../../config";
import HomeUI from "@/components/ui/home-ui";
import HabitSelect from "../../components/common/ui/habitSelect";
import ProgressCheck from "../../components/common/ui/progressCheck";
import StreakIndicator from "../../components/habit/StreakIndicator";
import SearchPartnerPopup from '@/components/popups/search-partner';
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground';
import { logger } from '../../utils/logger';

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
  const fetchInFlight = useRef<AbortController | null>(null);
  const isMounted = useRef(true);


  const fetchDashboardData = useCallback(async () => {
    let controller: AbortController | null = null;
    try {
      setLoading(true);

      // cancel previous in-flight request to avoid piling up
      if (fetchInFlight.current) {
        fetchInFlight.current.abort();
      }
      controller = new AbortController();
      fetchInFlight.current = controller;

      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        Alert.alert("Not Authenticated", "Please log in again.");
        router.replace("/screens/auth/LoginScreen");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/dashboard/home`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
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
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      logger.error('Dashboard fetch error:', err);
      
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
      if (controller && fetchInFlight.current === controller) {
        fetchInFlight.current = null;
      }
      if (isMounted.current) {
      setLoading(false);
      setRefreshing(false);
      }
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Ensure we cancel any inflight request on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      if (fetchInFlight.current) {
        fetchInFlight.current.abort();
      }
      isMounted.current = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleCheckIn = useCallback(async (habitId: string, habitName: string, currentStatus: boolean) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        Alert.alert("Not Authenticated", "Please log in again.");
        return;
      }

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

      // Optimistic update to avoid a full refetch
      setDashboardData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          todays_goals: prev.todays_goals.map(goal =>
            goal.habit_id === habitId
              ? { ...goal, checked_in_today: !currentStatus }
              : goal
          )
        };
      });
      fetchDashboardData();
      
    } catch (err: any) {
      logger.error('Check-in error:', err);
      Alert.alert("Check-in Failed", "Unable to check in. Please try again.");
    }
  }, [fetchDashboardData]);

  // Memoize goals transformation to avoid recalculating on every render
  const goals = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.todays_goals.map(goal => ({
      id: goal.habit_id,
      name: goal.habit_name,
      checked: goal.checked_in_today
    }));
  }, [dashboardData?.todays_goals]);

  const partnerActivities = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.partner_progress.map((activity) => ({
      text: `${activity.partner_name} checked in for ${activity.habit_name}!`
    }));
  }, [dashboardData?.partner_progress]);

  if (loading) {
    return (
      <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
        <PurpleParticles />
        <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-white mt-4 font-wix">Loading Dashboard...</Text>
        </View>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
        <PurpleParticles />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-xl mb-4 font-wix">⚠️ Failed to load dashboard</Text>
        <TouchableOpacity onPress={() => fetchDashboardData()}>
            <Text className="text-white/70 text-lg underline font-wix">Tap to Retry</Text>
        </TouchableOpacity>
        </View>
      </View>
    );
  }

   return (
    <View className="flex-1 relative" style={{backgroundColor: '#291133'}}>
      <PurpleParticles />
      <Image
        source={require('app/images/space/galaxy.png')}
        className="absolute bottom-0 right-0"
        style={{height: 300}}
        resizeMode="cover"
      />
      <ScrollView
        className="flex-1"
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />
        }
      >
        <View className="flex-1">
          <View className="w-full pt-12 pb-6 px-6">
            <Text className="text-white text-[36px] font-wix text-center">
              Hello, {dashboardData.user.display_name || dashboardData.user.username}!
            </Text>
          </View>

          <View className="mt-6 px-6">
            <Text className="text-white text-[28px] font-semibold mb-1">Streaks</Text>
            <View className="h-[1px] mb-2 bg-white/20" />
            
            {dashboardData.streaks.length > 0 ? (
              dashboardData.streaks.map((item) => (
                <View key={item.habit_id} className="flex-row justify-between mb-2 bg-white/5 rounded-xl p-3">
                  <Text className="text-white text-[18px] ml-2">{item.habit_name}</Text>
                  <StreakIndicator currentStreak={item.current_streak} isActive={true} />
                </View>
              ))
            ) : (
              <View className="py-4 bg-white/5 rounded-xl">
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
              <TouchableOpacity onPress={() => router.push('/screens/dashboard/ViewAllGoals')}>
                <Text className="text-white/70 text-xs">View All</Text>
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
                <Text className="text-white/70 text-xs">View All</Text>
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
                <View className="bg-white/10 rounded-2xl p-6 border border-white/20">
                  <Text className="text-white text-lg font-bold mb-2">🤝 No Partner Yet</Text>
                  <Text className="text-white/80 mb-4">
                    Invite a friend to start tracking habits together!
                  </Text>
                  <TouchableOpacity 
                    className="bg-white/20 rounded-full py-3 px-6 self-start"
                    onPress={() => setSearchPartnerVisible(true)}
                  >
                    <Text className="text-white font-semibold">Invite Partner</Text>
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