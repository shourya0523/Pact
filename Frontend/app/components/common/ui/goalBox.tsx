import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface GoalBoxProps {
    title: string
    progress: number
    currentValue: number
    targetValue: number
    onCheckIn?: () => void
    onViewGoal?: () => void
}

export default function GoalBox({
    title,
    progress,
    currentValue,
    targetValue,
    onCheckIn,
    onViewGoal
}: GoalBoxProps) {
    // Ensure progress is between 0 and 1
    const normalizedProgress = Math.min(Math.max(progress, 0), 1)
    const percentage = Math.round(normalizedProgress * 100)

    return (
        <View className="rounded-3xl p-3 shadow-lg w-[90%] mb-4 flex-row items-center" style={{ backgroundColor: '#E5E7EB', gap: 12 }}>
            {/* Progress Circle */}
            <View className="relative w-12 h-12 items-center justify-center">
                <View
                    className="absolute w-12 h-12 rounded-full border-4"
                    style={{ borderColor: '#D1D5DB' }}
                />
                <View
                    className="absolute w-12 h-12 rounded-full border-4"
                    style={{
                        borderColor: '#10B981',
                        borderTopColor: normalizedProgress > 0.875 ? '#10B981' : 'transparent',
                        borderRightColor: normalizedProgress > 0.625 ? '#10B981' : 'transparent',
                        borderBottomColor: normalizedProgress > 0.375 ? '#10B981' : 'transparent',
                        borderLeftColor: normalizedProgress > 0.125 ? '#10B981' : 'transparent',
                    }}
                />
                <View className="absolute items-center justify-center">
                    <Text className="text-xs font-bold" style={{ color: '#374151' }}>
                        {percentage}%
                    </Text>
                </View>
            </View>

            {/* Goal Info */}
            <View className="flex-1">
                <Text className="font-semibold text-sm mb-1" style={{ color: '#111827' }}>
                    {title}
                </Text>
                <View className="flex-row items-center" style={{ gap: 4 }}>
                    <Text className="text-base font-bold" style={{ color: '#1F2937' }}>
                        {currentValue}/{targetValue}
                    </Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row" style={{ gap: 6 }}>
                {/* Check In Button */}
                <TouchableOpacity
                    onPress={onCheckIn}
                    className="rounded-xl py-2 px-3 flex-row items-center justify-center"
                    style={{ backgroundColor: '#291133', gap: 4 }}
                >
                    <Ionicons name="checkmark-circle" size={16} color="white" />
                    <Text className="text-white font-semibold text-xs">
                        Check In
                    </Text>
                </TouchableOpacity>

                {/* View Goal Button */}
                <TouchableOpacity
                    onPress={onViewGoal}
                    className="rounded-xl py-2 px-3"
                    style={{ backgroundColor: '#6B7280' }}
                >
                    <Ionicons name="eye" size={16} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    )
}