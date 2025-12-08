import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { View, Text, Image, ActivityIndicator, ScrollView, RefreshControl, Alert, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../../../config";
import DashboardLayout from "../../components/navigation/DashboardLayout";
import HabitSelect from "../../components/common/ui/habitSelect";
import ProgressCheck from "../../components/common/ui/progressCheck";
import StreakIndicator from "../../components/habit/StreakIndicator";
import SearchPartnerPopup from '@/components/popups/search-partner';
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground';
import { logger } from '../../utils/logger';
import TutorialElement from '../../components/tutorial/TutorialElement';
import ActivitySummary from '../../components/common/ui/ActivitySummary';
import { notificationAPI } from '../../services/notificationAPI';
import { Ionicons } from '@expo/vector-icons';

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
  activity_summary: {
    total_partners: number;
    total_habits: number;
    total_goals: number;
    total_checkins: number;
  };
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [searchPartnerVisible, setSearchPartnerVisible] = useState(false);
  const [partnerId, setPartnerId] = useState<string>('');
  const [partnerHabits, setPartnerHabits] = useState<Array<{id: string, habit_name: string}>>([]);
  const [sendingNudge, setSendingNudge] = useState(false);
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
          partnership: null,
          activity_summary: {
            total_partners: 0,
            total_habits: 0,
            total_goals: 0,
            total_checkins: 0
          }
        });
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
      
      // Fetch partner info and habits if partnership exists
      if (data.partnership) {
        try {
          const token = await AsyncStorage.getItem('access_token');
          const partnershipResponse = await fetch(`${BASE_URL}/api/partnerships/current`, {
            headers: {'Authorization': `Bearer ${token}`}
          });
          if (partnershipResponse.ok) {
            const partnershipData = await partnershipResponse.json();
            setPartnerId(partnershipData.partner?.id || partnershipData.partner?._id || '');
            
            // Fetch shared habits
            const habitsResponse = await fetch(`${BASE_URL}/api/habits`, {
              headers: {'Authorization': `Bearer ${token}`}
            });
            if (habitsResponse.ok) {
              const habitsData = await habitsResponse.json();
              const sharedHabits = habitsData
                .filter((h: any) => h.partnership_id)
                .map((h: any) => ({ id: h.id || h._id, habit_name: h.habit_name }));
              setPartnerHabits(sharedHabits);
            }
          }
        } catch (err) {
          logger.error('Error fetching partner info:', err);
        }
      }
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
        partnership: null,
        activity_summary: {
          total_partners: 0,
          total_habits: 0,
          total_goals: 0,
          total_checkins: 0
        }
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

  // Check if tutorial should be shown for first-time users
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        const tutorialShown = await AsyncStorage.getItem('tutorial_shown');
        if (!tutorialShown) {
          // Show tutorial for first-time users after a brief delay
          setTimeout(() => {
            router.push('/screens/settings/TutorialScreen');
            AsyncStorage.setItem('tutorial_shown', 'true');
          }, 1000);
        }
      } catch (error) {
        logger.error('Error checking tutorial status:', error);
      }
    };
    checkFirstTimeUser();
  }, [router]);

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

  const handleNudge = async (habitId?: string) => {
    if (!partnerId) {
      Alert.alert('Error', 'Unable to send nudge. No partner found.');
      return;
    }

    // If no specific habit, use the first shared habit
    const targetHabitId = habitId || partnerHabits[0]?.id;
    if (!targetHabitId) {
      Alert.alert('Error', 'No shared habits found to nudge about.');
      return;
    }

    try {
      setSendingNudge(true);
      const result = await notificationAPI.sendNudge(partnerId, targetHabitId);
      const habitName = partnerHabits.find(h => h.id === targetHabitId)?.habit_name || 'their habit';
      Alert.alert(
        '✅ Nudge Sent!',
        `You've nudged ${dashboardData?.partnership?.partner_name || 'your partner'} to work on ${habitName}!`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      logger.error('Error sending nudge:', error);
      const errorMessage = error.message || 'Failed to send nudge. Please try again.';
      Alert.alert(
        errorMessage.includes('once per day') ? '⏰ Rate Limit' : 'Error',
        errorMessage
      );
    } finally {
      setSendingNudge(false);
    }
  };

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
    <DashboardLayout>
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
          <TutorialElement id="dashboard-greeting">
            <View className="w-full pt-12 pb-6 px-6">
              <Text className="text-white text-[36px] font-wix text-center">
                Hello, {dashboardData.user.display_name || dashboardData.user.username}!
              </Text>
            </View>
          </TutorialElement>

          <TutorialElement id="activity-summary">
            <ActivitySummary
              totalPartners={dashboardData.activity_summary?.total_partners || 0}
              totalHabits={dashboardData.activity_summary?.total_habits || 0}
              totalGoals={dashboardData.activity_summary?.total_goals || 0}
              totalCheckins={dashboardData.activity_summary?.total_checkins || 0}
            />
          </TutorialElement>

          <TutorialElement id="streaks-section">
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
          </TutorialElement>

          <TutorialElement id="todays-goals">
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
                onPress={async (habit) => {
                  try {
                    const userData = await AsyncStorage.getItem('user_data');
                    if (!userData) {
                      Alert.alert("Not Authenticated", "Please log in again.");
                      router.replace("/screens/auth/LoginScreen");
                      return;
                    }
                    const user = JSON.parse(userData);
                    router.push({
                      pathname: '/screens/dashboard/GoalPage',
                      params: {
                        habitId: habit.id,
                        userId: user.id
                      }
                    });
                  } catch (err) {
                    logger.error('Navigation error:', err);
                    Alert.alert("Error", "Unable to navigate to goal page.");
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
          </TutorialElement>

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
                  <Text className="text-white/40 text-sm mt-1 mb-4">
                    Your partner hasn't checked in yet today
                  </Text>
                  {partnerId && partnerHabits.length > 0 && (
                    <TouchableOpacity
                      onPress={() => handleNudge()}
                      disabled={sendingNudge}
                      className="bg-purple-600/80 rounded-full px-6 py-3 flex-row items-center gap-2 border border-purple-400/50"
                      activeOpacity={0.8}
                    >
                      {sendingNudge ? (
                        <>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text className="text-white font-wix font-semibold">Sending...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="notifications-outline" size={18} color="#fff" />
                          <Text className="text-white font-wix font-semibold">
                            Nudge Partner
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
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
      </View>
    </DashboardLayout>
  );
}