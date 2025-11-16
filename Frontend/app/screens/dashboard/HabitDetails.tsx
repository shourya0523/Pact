import React, { useEffect, useState } from 'react'
import { View, ScrollView, Text, ActivityIndicator, Alert, RefreshControl } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../../config'
import ProgressCircle from 'app/components/habit/ProgressCircle'
import BackwardButton from '../../components/common/ui/backwardButton'
import PurpleParticles from 'app/components/space/purpleStarsParticlesBackground'
import HabitBox from '../../components/common/ui/habitBox'
import GreyButton from '../../components/common/ui/greyButton'

interface Goal {
  user_id: string;
  goal_name: string;
  progress_percentage: number;
}

interface HabitData {
  id: string;
  habit_name: string;
  count_checkins: number;
  current_streak?: number;
  partnership_id: string;
}

interface HabitLog {
  date: string;
  completed: boolean;
}

export default function HabitDetails() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const habitId = params.habitId as string

  const [habit, setHabit] = useState<HabitData | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (habitId) {
      fetchHabitDetails()
    }
  }, [habitId])

  const fetchHabitDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token')
      
      if (!token) {
        Alert.alert("Not Authenticated", "Please log in again.")
        router.replace("/screens/auth/LoginScreen")
        return
      }

      const BASE_URL = await getBaseUrl()

      // Fetch habit details
      const habitResponse = await fetch(`${BASE_URL}/api/habits/${habitId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (habitResponse.ok) {
        const habitData = await habitResponse.json()
        setHabit(habitData)
      }

      // Fetch goals
      const goalsResponse = await fetch(`${BASE_URL}/api/goals/habits/${habitId}/goals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json()
        setGoals(goalsData)
      }

      // Fetch habit logs for calendar
      const logsResponse = await fetch(`${BASE_URL}/api/habits/${habitId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setLogs(logsData)
      }

    } catch (err) {
      console.error('Fetch habit details error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchHabitDetails()
  }

  // Get days in current month
  const getDaysInMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  // Check if a day was completed
  const isDayCompleted = (day: number) => {
    const now = new Date()
    const checkDate = new Date(now.getFullYear(), now.getMonth(), day)
    const dateStr = checkDate.toISOString().split('T')[0]
    return logs.some(log => log.date === dateStr && log.completed)
  }

  const getMonthName = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
    return `${months[new Date().getMonth()]} ${new Date().getFullYear()}`
  }

  if (loading) {
    return (
      <View className="flex-1 relative">
        <PurpleParticles />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text className="text-white mt-4">Loading Habit...</Text>
        </View>
      </View>
    )
  }

  if (!habit) {
    return (
      <View className="flex-1 relative">
        <PurpleParticles />
        <View className="flex-1 items-center justify-center">
          <Text className="text-white text-xl">Habit not found</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 relative">
      <PurpleParticles />
      
      <View className="absolute mt-6 left-8 z-50">
        <BackwardButton />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
      >
        <Text className="font-wix text-white text-[38px] text-center mt-10">
          {habit.habit_name}
        </Text>

        <View className="items-center justify-center mt-4">
          <HabitBox
            title={habit.habit_name}
            progress={habit.count_checkins ? habit.count_checkins / 100 : 0}
            streak={habit.current_streak || 0}
            leftAvatar="https://example.com/user-avatar.jpg"
            rightAvatar="https://example.com/partner-avatar.jpg"
            partnerName="Partner"
          />
        </View>

        <View className="flex-row justify-center items-start mt-4 space-x-6">
          {/* Goal 1 */}
          {goals[0] && (
            <View className="flex-col items-center">
              <ProgressCircle progress={goals[0].progress_percentage} size={80} />
              <View className="bg-white rounded-2xl p-4 w-40 h-28 mt-4 justify-center items-center">
                <Text className="font-bold text-lg mb-2 text-center">GOAL:</Text>
                <Text className="text-center text-sm">
                  {goals[0].goal_name}
                </Text>
              </View>
            </View>
          )}

          {/* Vertical Divider */}
          {goals.length > 1 && (
            <View
              className="w-[2px] bg-white"
              style={{ height: 240 }}
            />
          )}

          {/* Goal 2 */}
          {goals[1] && (
            <View className="flex-col items-center">
              <ProgressCircle progress={goals[1].progress_percentage} size={80} opacityRingColor="rgba(255,255,255,0.1)" />
              <View className="bg-white rounded-2xl p-4 w-40 h-28 mt-4 justify-center items-center">
                <Text className="font-bold text-lg mb-2 text-center">GOAL:</Text>
                <Text className="text-center text-sm">
                  {goals[1].goal_name}
                </Text>
              </View>
            </View>
          )}

          {/* No goals message */}
          {goals.length === 0 && (
            <View className="flex-col items-center py-8">
              <Text className="text-white/60 text-center">No goals set yet</Text>
              <Text className="text-white/40 text-sm text-center mt-2">
                Add a goal to track progress!
              </Text>
            </View>
          )}
        </View>

        {/* Calendar */}
        <View className="bg-[#2a0055] rounded-2xl p-4 mt-8">
          <Text className="text-white text-center text-xl mb-4">
            {getMonthName()}
          </Text>
          <View className="flex-row flex-wrap justify-center">
            {Array.from({ length: getDaysInMonth() }, (_, i) => {
              const day = i + 1
              const isCompleted = isDayCompleted(day)
              return (
                <View
                  key={i}
                  className={`w-9 h-9 rounded-xl justify-center items-center m-1 ${
                    isCompleted ? 'bg-green-400' : 'bg-white'
                  }`}
                >
                  <Text className={`font-semibold ${isCompleted ? 'text-white' : 'text-black'}`}>
                    {day}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-5 w-full px-5 items-center">
        <GreyButton 
          text="EDIT HABIT" 
          onPress={() => console.log('Edit habit')}
        />
      </View>
    </View>
  );
}