import React from 'react'
import { ScrollView, Text, StyleSheet } from 'react-native'
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../assets/theme";
import { useRouter } from "expo-router";

import HabitsBox from '@/components/dashboard-ui/habits-box'
import ActivityBox from '@/components/dashboard-ui/latest-activity-box'

const latestActivites = [
    {
        id: '1', 
        title: 'Drinking 300ml water',
        description: 'About 3 minutes ago',
    },
    {
        id: '2', 
        title: 'Walking 20 minutes',
        description: 'About 7 minutes ago',
    },
    {
        id: '3', 
        title: 'Biking 10 miles',
        description: 'About 5 hours ago',
    },
]

export default function Home() {
    const router = useRouter();

    return (
        <LinearGradient
              colors={[theme.colors.backgroundGradientStart, theme.colors.backgroundGradientEnd]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.container}
        >

        <ScrollView>
            <Text>1 Day</Text>
            <Text>Your current streak: </Text>
            <HabitsBox
                name="Drinking water"
                percentage={75} 
            />
            <HabitsBox
                name="Cycling" 
                percentage={40} 
            />
            <HabitsBox
                name="Walking" 
                percentage={30} 
            />
            <HabitsBox
                name="Gym" 
                percentage={60} 
            />
            <Text>Latest Activity</Text>
            <Text>See more</Text>
            <ActivityBox 
                activityAction="Drinking 300ml water"
                activityTime="About 3 minutes ago"
            />
        </ScrollView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",

    flexWrap: 'wrap',
    padding: 10,
  },
})