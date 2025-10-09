import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useRouter } from "expo-router"
import GradientBackground from "../../components/common/ui/gradientBackground";
import CircularButton from '@/components/ui/CircularButton';
import HabitsBox from '@/components/dashboard-ui/habit-box'
import ActivityBox from '@/components/dashboard-ui/activity-box'

const latestActivities = [
  { id: '1', title: 'Drinking 300ml water', description: 'About 3 minutes ago' },
  { id: '2', title: 'Walking 20 minutes', description: 'About 7 minutes ago' },
  { id: '3', title: 'Biking 10 miles', description: 'About 5 hours ago' },
]

export default function Home() {
  const router = useRouter()

  return (
    <GradientBackground>
      <ScrollView
        flex-1
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        <Text className="text-white text-[28px] m-4">TODAY</Text>

        <View className="bg-white rounded-3xl items-start justify-center px-6 py-4 w-[90%] h-[125px] my-4 shadow">
            <Text className="text-2xl font-bold text-gray-800">1 Day</Text>
            <Text className="text-base text-gray-600 mt-1">Your current streak:</Text>
        </View>

        <View className="flex-1 relative">
            <View className="flex flex-wrap flex-row justify-center">
                <HabitsBox name="Drinking water" percentage={75} />
                <HabitsBox name="Cycling" percentage={40} />
                <HabitsBox name="Walking" percentage={30} />
                <HabitsBox name="Gym" percentage={60} />
                <View className="absolute bottom-0 right-4">
                    <CircularButton />
                </View>
            </View>
        </View>

        <View className="w-full px-4 mt-6 ">
          <View className="flex-row justify-between items-center px-6">
            <Text className="text-lg font-semibold text-gray-800">Latest Activity</Text>
            <Text
              className="font-semibold text-sm"
            >
              See more
            </Text>
          </View>

        <View className="mt-3 items-center">
          {latestActivities.map((activity) => (
            <ActivityBox
              key={activity.id}
              activityAction={activity.title}
              activityTime={activity.description}
            />
          ))}
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  )
}
