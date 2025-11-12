import React from "react";
import { View, Text } from "react-native";

interface PartnerProgressItemProps {
  text: string;
}

const PartnerProgressItem: React.FC<PartnerProgressItemProps> = ({ text }) => {
  return (
    <View className="bg-white rounded-full p-3 mb-2 flex-row justify-between items-center">
      <Text className="text-black text-sm">{text}</Text>
      <Text className="text-green-500 font-bold">✓</Text>
    </View>
  );
};

export default PartnerProgressItem;
