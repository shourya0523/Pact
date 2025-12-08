import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ActivitySummaryProps {
  totalPartners: number;
  totalHabits: number;
  totalGoals: number;
  totalCheckins: number;
}

export default function ActivitySummary({
  totalPartners,
  totalHabits,
  totalGoals,
  totalCheckins,
}: ActivitySummaryProps) {
  const router = useRouter();

  const stats = [
    {
      label: 'Partners',
      value: totalPartners,
      icon: 'people' as const,
      route: '/screens/dashboard/ViewAllPartnerships',
    },
    {
      label: 'Habits',
      value: totalHabits,
      icon: 'list' as const,
      route: '/screens/dashboard/HabitViews',
    },
    {
      label: 'Goals',
      value: totalGoals,
      icon: 'flag' as const,
      route: '/screens/dashboard/ViewAllGoals',
    },
    {
      label: 'Check-ins',
      value: totalCheckins,
      icon: 'checkmark-done' as const,
      route: '/screens/dashboard/HabitViews',
    },
  ];

  return (
    <View className="mt-6 px-6">
      <Text className="text-white text-[28px] font-semibold mb-1 font-wix">Activity Summary</Text>
      <View className="h-[1px] mb-4 bg-white/20" />
      
      <View className="flex-row flex-wrap justify-between">
        {stats.map((stat, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            onPress={() => router.push(stat.route)}
            className="bg-white/10 rounded-2xl border border-white/20"
            style={{ 
              width: '48%',
              padding: 16,
              minHeight: 110,
              marginBottom: 12,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View
                className="rounded-full p-2.5"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <Ionicons name={stat.icon} size={20} color="rgba(255, 255, 255, 0.9)" />
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.4)" />
            </View>
            <Text className="text-white text-[32px] font-bold font-wix mb-1">
              {stat.value.toLocaleString()}
            </Text>
            <Text className="text-white/70 text-sm font-wix">{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

