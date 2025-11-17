import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

interface Habit {
  id: string;
  name: string;
}

interface HabitSelectProps {
  habits: Habit[];
  onPress?: (habit: Habit) => void; 
}

const HabitSelect: React.FC<HabitSelectProps> = ({ habits, onPress }) => {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={habits}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onPress && onPress(item)}
          className="bg-white/90 w-36 h-36 rounded-2xl justify-center items-center mr-6"
        >
          <Text className="font-semibold text-center text-black">{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
};

export default HabitSelect;
