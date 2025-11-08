import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'

interface GoalSetProps {
  visible: boolean
  onClose: () => void
  onSelect: (type: 'completion' | 'frequency') => void
}

const GoalSet: React.FC<GoalSetProps> = ({ visible, onClose, onSelect }) => {
  if (!visible) return null

  return (
    <View className="absolute inset-0 justify-center items-center bg-black/60">
      <View className="bg-[#9A84A2] rounded-2xl p-6 w-72 items-center">
        <Text className="text-[#291133] text-[20px] text-center mb-10 font-medium">
          Is your goal completion (yes/no) or frequency (complete x times) based?
        </Text>

        <TouchableOpacity
          className="bg-white w-full h-[50px] py-2 rounded-2xl mb-3 justify-center"
          onPress={() => {
            onSelect('completion')
            onClose()
          }}
        >
          <Text className="text-center text-purple-900 font-semibold">
            Completion
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
         className="bg-white w-full h-[50px] py-2 rounded-2xl mb-3 justify-center"
          onPress={() => {
            onSelect('frequency')
            onClose()
          }}
        >
          <Text className="text-center text-purple-900 font-semibold">
            Frequency
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default GoalSet
