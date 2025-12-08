import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Animated } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../../config';
import PurpleParticles from "app/components/space/purpleStarsParticlesBackground";
import ProgressCircle from "app/components/habit/ProgressCircle";
import GoalProgressChart from "app/components/habit/GoalProgressChart";
import { Ionicons } from '@expo/vector-icons';

interface GoalData {
  user_id: string;
  habit_id: string;
  habit_name: string;
  goal_name: string;
  goal_type: string;
  progress_percentage: number;
  count_checkins: number;
  total_checkins_required: number;
  is_completed: boolean;
  target_value?: number;
  goal_progress?: number;
}

export default function GoalDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const habitId = params.habitId as string;
  const userId = params.userId as string;

  const [goal, setGoal] = useState<GoalData | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Partner Name');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (habitId && userId) {
      fetchGoalDetails();
    }
  }, [habitId, userId]);

  const fetchGoalDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (!token || !userData) {
        Alert.alert("Not Authenticated", "Please log in again.");
        router.replace("/screens/auth/LoginScreen");
        return;
      }

      const user = JSON.parse(userData);
      const targetUserId = userId || user.id;

      const response = await fetch(
        `${BASE_URL}/api/goals/habits/${habitId}/users/${targetUserId}/goal`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGoal(data);

        const partnershipResponse = await fetch(`${BASE_URL}/api/partnerships/current`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (partnershipResponse.ok) {
          const partnershipData = await partnershipResponse.json();
          setPartnerName(partnershipData.partner.username);
        }
      }
    } catch (err) {
      console.error('Fetch goal error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGoalDetails();
  };

  const handleEditPress = () => {
    if (!goal || !habitId) {
      Alert.alert("Error", "Cannot edit goal - missing information");
      return;
    }
    
    // Route to the correct goal type screen
    if (goal.goal_type === 'frequency') {
      router.push({
        pathname: "/screens/dashboard/FrequencyGoals",
        params: { 
          habitId: goal.habit_id,
          userId: goal.user_id,
          editMode: 'true'
        }
      });
    } else if (goal.goal_type === 'completion') {
      router.push({
        pathname: "/screens/dashboard/CompletionGoals",
        params: { 
          habitId: goal.habit_id,
          userId: goal.user_id,
          editMode: 'true'
        }
      });
    }
  };

  const handleDeletePress = () => {
    if (!goal || !habitId) {
      Alert.alert("Error", "Cannot delete goal - missing information");
      return;
    }

    Alert.alert(
      "Delete Goal",
      `Are you sure you want to delete "${goal.goal_name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              if (!token) {
                Alert.alert("Not Authenticated", "Please log in again.");
                return;
              }

              const response = await fetch(
                `${BASE_URL}/api/goals/habits/${goal.habit_id}/users/${goal.user_id}/goal`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              if (response.ok) {
                Alert.alert(
                  "Goal Deleted",
                  "Your goal has been deleted successfully.",
                  [{
                    text: "OK",
                    onPress: () => router.back()
                  }]
                );
              } else {
                const errorData = await response.json();
                Alert.alert("Delete Failed", errorData.detail || "Unable to delete goal.");
              }
            } catch (err) {
              console.error('Delete goal error:', err);
              Alert.alert("Error", "Unable to delete goal. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleCheckIn = useCallback((value?: number) => {
    if (!goal) return;
    
    // For completion goals with target_value, prompt for value if not provided
    if (goal.goal_type === 'completion' && goal.target_value !== undefined && goal.target_value !== null && value === undefined) {
      Alert.prompt(
        "Enter Value",
        `How much did you complete? (Target: ${goal.target_value})`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Submit",
            onPress: (inputValue: string | undefined) => {
              if (!inputValue || inputValue.trim() === '') {
                Alert.alert("Error", "Please enter a value.");
                return;
              }
              const numValue = parseFloat(inputValue);
              if (isNaN(numValue) || numValue < 0) {
                Alert.alert("Error", "Please enter a valid positive number.");
                return;
              }
              // Defer async call to next tick to avoid synthetic event issues
              setTimeout(() => {
                performCheckIn(numValue).catch((err) => {
                  console.error('Check-in error:', err);
                  Alert.alert("Error", "Unable to check in.");
                });
              }, 0);
            }
          }
        ],
        "plain-text",
        "",
        "numeric"
      );
      return;
    }
    
    // Defer async call to next tick to avoid synthetic event issues
    setTimeout(() => {
      performCheckIn(value).catch((err) => {
        console.error('Check-in error:', err);
        Alert.alert("Error", "Unable to check in.");
      });
    }, 0);
  }, [goal]);

  const performCheckIn = async (value?: number) => {
    if (!goal) return;
    setCheckingIn(true);

    // Pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Not Authenticated", "Please log in again.");
        router.replace("/screens/auth/LoginScreen");
        return;
      }

      const body: any = { completed: true };
      if (value !== undefined && value !== null) {
        body.value = value;
      }
      
      const response = await fetch(`${BASE_URL}/api/habits/${goal.habit_id}/log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        Alert.alert("Checked In! ✅", "Great job! Keep up the momentum! 🔥");
        // Refresh goal data to show updated progress
        await fetchGoalDetails();
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Unable to check in. Please try again." }));
        Alert.alert("Check-in Failed", errorData.detail || "Unable to check in. Please try again.");
      }
    } catch (err) {
      console.error('Check-in error:', err);
      Alert.alert("Error", "Unable to check in. Please check your connection.");
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 relative">
        <PurpleParticles />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-white mt-4">Loading Goal...</Text>
        </View>
      </View>
    );
  }

  if (!goal) {
    return (
      <View className="flex-1 relative">
        <PurpleParticles />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-xl">Goal not found</Text>
        </View>
      </View>
    );
  }

  const progressPercentage = Math.min(Math.max(goal.progress_percentage || 0, 0), 100);
  const remainingCheckins = Math.max((goal.total_checkins_required || 0) - (goal.count_checkins || 0), 0);

  return (
    <View className="flex-1 relative">
      <PurpleParticles />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 60, paddingBottom: 140, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
      >
        {/* Header Section with Goal Name */}
        <View className="items-center mb-8">
          <View className="bg-white/10 rounded-3xl px-6 py-4 border border-white/20 shadow-lg">
            <Text className="font-wix text-white text-[32px] text-center font-bold">
              {goal.goal_name}
            </Text>
            {goal.is_completed && (
              <View className="flex-row items-center justify-center mt-2">
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text className="text-green-400 text-sm font-semibold ml-2">Goal Completed!</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Main Progress Card with Check-In Button */}
        <View className="bg-white/15 rounded-3xl p-6 mb-6 border border-white/20 shadow-2xl">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1 items-center">
              <ProgressCircle 
                progress={progressPercentage} 
                size={120} 
                strokeWidth={12}
                backgroundColor="#4B5563"
                progressColor={goal.is_completed ? "#10B981" : "#C9B0E8"}
              />
              <Text className="text-white/80 text-xs mt-2 font-wix">Progress</Text>
            </View>
            
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                onPress={() => handleCheckIn()}
                activeOpacity={0.8}
                disabled={checkingIn || goal.is_completed}
                className="px-8 py-5 rounded-2xl justify-center items-center shadow-lg"
                style={{
                  backgroundColor: goal.is_completed ? 'rgba(75, 85, 99, 0.5)' : '#C9B0E8',
                  minWidth: 140,
                }}
              >
                {checkingIn ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : goal.is_completed ? (
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-done-circle" size={24} color="#fff" />
                    <Text className="text-white text-[18px] font-bold ml-2">DONE</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={24} color="#000" />
                    <Text className="text-black text-[18px] font-bold ml-2">CHECK IN</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Quick Stats Row */}
          <View className="flex-row justify-around pt-4 border-t border-white/10">
            <View className="items-center">
              <Text className="text-white/60 text-xs font-wix mb-1">Check-ins</Text>
              <Text className="text-white text-2xl font-bold">{goal.count_checkins || 0}</Text>
            </View>
            <View className="items-center">
              <Text className="text-white/60 text-xs font-wix mb-1">Remaining</Text>
              <Text className="text-white text-2xl font-bold">{remainingCheckins}</Text>
            </View>
            <View className="items-center">
              <Text className="text-white/60 text-xs font-wix mb-1">Target</Text>
              <Text className="text-white text-2xl font-bold">{goal.total_checkins_required || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Info Cards Grid */}
        <View className="flex-row justify-between mb-6" style={{ gap: 12 }}>
          <View className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/20 items-center">
            <Ionicons name="people" size={24} color="#C9B0E8" />
            <Text className="text-white/60 text-xs font-wix mt-2 mb-1">PARTNERSHIP</Text>
            <Text className="text-white text-sm font-semibold text-center" numberOfLines={1}>
              {partnerName}
            </Text>
          </View>
          <View className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/20 items-center">
            <Ionicons name="flame" size={24} color="#C9B0E8" />
            <Text className="text-white/60 text-xs font-wix mt-2 mb-1">HABIT</Text>
            <Text className="text-white text-sm font-semibold text-center" numberOfLines={1}>
              {goal.habit_name}
            </Text>
          </View>
        </View>

        {/* Goal Details Card */}
        <View className="bg-white/10 rounded-3xl p-6 mb-6 border border-white/20">
          <View className="flex-row items-center justify-center mb-4">
            <Ionicons name="information-circle" size={20} color="#C9B0E8" />
            <Text className="text-white font-bold text-lg ml-2 font-wix">GOAL DETAILS</Text>
          </View>
          
          <View className="bg-white/5 rounded-2xl p-4 mb-3">
            <Text className="text-white/60 text-xs font-wix mb-1">Goal Type</Text>
            <View className="flex-row items-center">
              <Ionicons 
                name={goal.goal_type === 'frequency' ? 'repeat' : 'flag'} 
                size={16} 
                color="#C9B0E8" 
              />
              <Text className="text-white text-base font-semibold ml-2 capitalize">
                {goal.goal_type} Goal
              </Text>
            </View>
          </View>

          {goal.target_value !== undefined && goal.target_value !== null && (
            <View className="bg-white/5 rounded-2xl p-4">
              <Text className="text-white/60 text-xs font-wix mb-1">Target Value</Text>
              <Text className="text-white text-base font-semibold">
                {goal.target_value} {goal.goal_type === 'completion' ? 'units' : 'times'}
              </Text>
            </View>
          )}
        </View>

        {/* Progress Visualization Card */}
        <View className="bg-white/10 rounded-3xl p-6 mb-6 border border-white/20">
          <View className="flex-row items-center justify-center mb-4">
            <Ionicons name="stats-chart" size={20} color="#C9B0E8" />
            <Text className="text-white font-bold text-lg ml-2 font-wix">PROGRESS TREND</Text>
          </View>
          {goal && (
            <GoalProgressChart
              habitId={goal.habit_id}
              userId={goal.user_id}
              goalType={goal.goal_type}
              targetValue={goal.target_value}
              goalProgress={goal.goal_progress}
            />
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Buttons */}
      <View 
        className="absolute bottom-0 left-0 right-0 pb-8 pt-4 px-6"
        style={{ 
          backgroundColor: 'rgba(41, 17, 51, 0.95)',
        }}
      >
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={handleEditPress}
            activeOpacity={0.8}
            className="bg-white/15 rounded-2xl py-4 px-6 flex-row items-center justify-center border border-white/20"
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text className="text-white text-[16px] font-bold ml-2 font-wix">EDIT GOAL</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleDeletePress}
            activeOpacity={0.8}
            className="bg-red-600/80 rounded-2xl py-4 px-6 flex-row items-center justify-center border border-red-500/30"
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text className="text-white text-[16px] font-bold ml-2 font-wix">DELETE GOAL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}