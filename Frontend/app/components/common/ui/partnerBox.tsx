import React from 'react'
import { View, Text, Image } from 'react-native'

export default function PartnerBox({ partner }: { partner: string }) {
  return (
    <View className="bg-[#1E1E2F] rounded-3xl p-4 shadow-lg w-[420px] mx-auto mt-6 flex-row items-center space-x-4">
      <Image
        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
        className="w-8 h-8 rounded-full"
      />
      <View className="flex-1">
        <Text className="font-wix text-white text-[14px]">
          Invite {partner}
        </Text>
      </View>
    </View>
  )
}