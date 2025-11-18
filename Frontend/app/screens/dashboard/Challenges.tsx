import React from "react";
import { ScrollView, View, Text } from 'react-native'
import { useRouter } from "expo-router"
import GradientBackground from "app/components/space/whiteStarsParticlesBackground";
import Challenge from "@/components/dashboard-ui/challenge";

const challenges = [
    { id: '1', title: 'Sleep before 12AM', set: '7 Days Challenges'},
    { id: '2', title: 'Drink 1 gallon of water', set: '7 Days Challenges'},
    { id: '3', title: 'Stairmaster for 30 minutes', set: 'Gym warmup'},
]

export default function Challenges() {
    const router = useRouter()

    return (
        <GradientBackground>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ alignItems: 'center' }}
            >
                <Text className="text-white text-[28px] m-4">TODAY</Text>
                {challenges.map((challenge) => (
                    <Challenge
                        key={challenge.id}
                        challengeName={challenge.title}
                        challengeSet={challenge.set}
                    />
                ))}
            </ScrollView>
        </GradientBackground>
    )
}