import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../../config';
import PurpleParticles from "app/components/space/purpleStarsParticlesBackground";
import GreyButton from "@/components/ui/greyButton";
import ProgressCircle from "app/components/habit/ProgressCircle";

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
        pathname: "/screens/dashboard/Goals",
        params: { 
          habitId: goal.habit_id,
          userId: goal.user_id,
          editMode: 'true'
        }
      });
    }
  };

  const handleCheckIn = async (value?: number) => {
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
            onPress: async (inputValue) => {
              if (!inputValue || inputValue.trim() === '') {
                Alert.alert("Error", "Please enter a value.");
                return;
              }
              const numValue = parseFloat(inputValue);
              if (isNaN(numValue) || numValue < 0) {
                Alert.alert("Error", "Please enter a valid positive number.");
                return;
              }
              await performCheckIn(numValue);
            }
          }
        ],
        "plain-text",
        "",
        "numeric"
      );
      return;
    }
    
    await performCheckIn(value);
  };

  const performCheckIn = async (value?: number) => {
    if (!goal) return;
    setCheckingIn(true);

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const body: any = { completed: true };
      if (value !== undefined) {
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
        fetchGoalDetails();
      } else {
        Alert.alert("Check-in Failed", "Unable to check in. Please try again.");
      }
    } catch (err) {
      console.error('Check-in error:', err);
      Alert.alert("Error", "Unable to check in.");
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

  return (
    <View className="flex-1 relative">
      <PurpleParticles />
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 48, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
      >
        <Text className="font-wix text-white text-[38px] text-center mb-8">
          {goal.goal_name}
        </Text>
        
        {/* Progress and Check-In Section */}
        <View className="flex-row justify-center items-center mb-6" style={{ gap: 24 }}>
          <ProgressCircle 
            progress={goal.progress_percentage} 
            size={96} 
            strokeWidth={10} 
            showShadow={true} 
          />
          <TouchableOpacity
            onPress={handleCheckIn}
            activeOpacity={0.7}
            className="bg-[#C9B0E8] px-12 py-6 rounded-full justify-center items-center"
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-black text-[24px] font-bold">CHECK IN</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Cards */}
        <View className="flex-row justify-between mb-6 w-[90%] self-center" style={{ gap: 12 }}>
          <View className="bg-white rounded-2xl flex-1 h-20 justify-center items-center">
            <Text className="font-bold text-base">PARTNERSHIP</Text>
            <Text className="text-gray-500 text-sm">{partnerName}</Text>
          </View>
          <View className="bg-white rounded-2xl flex-1 h-20 justify-center items-center">
            <Text className="font-bold text-base">HABIT</Text>
            <Text className="text-gray-500 text-sm">{goal.habit_name}</Text>
          </View>
        </View>

        {/* Progress Stats */}
        <View className="mb-6 bg-white/20 rounded-3xl p-6 w-[95%] self-center">
          <Text className="text-white font-bold text-lg text-center mb-4">
            GOAL PROGRESS
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-white text-2xl font-bold">{goal.count_checkins}</Text>
              <Text className="text-white/70 text-sm">Check-ins</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-2xl font-bold">{goal.total_checkins_required || 'N/A'}</Text>
              <Text className="text-white/70 text-sm">Target</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-2xl font-bold">{Math.round(goal.progress_percentage)}%</Text>
              <Text className="text-white/70 text-sm">Progress</Text>
            </View>
          </View>
        </View>

        {/* Goal Type Info */}
        <View className="mb-6 bg-white/20 rounded-3xl p-6 w-[95%] self-center">
          <Text className="text-white font-bold text-lg text-center mb-2">
            GOAL TYPE
          </Text>
          <Text className="text-white text-center capitalize">
            {goal.goal_type} Goal
          </Text>
          {goal.is_completed && (
            <Text className="text-green-400 text-center mt-4 font-bold text-lg">
              ✅ COMPLETED!
            </Text>
          )}
        </View>

        {/* Placeholder for future visualizations */}
        <View className="bg-white/20 rounded-3xl p-6 h-40 w-[95%] self-center justify-center items-center">
          <Text className="text-white font-semibold text-center">
            PROGRESS VISUALIZATION
          </Text>
          <Text className="text-white/50 text-xs text-center mt-2">
            Coming Soon
          </Text>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-transparent pb-6 pt-3 px-6 items-center">
        <GreyButton onPress={handleEditPress} text="EDIT GOAL" />
      </View>
    </View>
  );
}