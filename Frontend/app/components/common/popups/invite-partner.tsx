import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Partner {
  id: string;
  name: string;
}

interface InvitePartnersProps {
  partners: Partner[];
  onInvitePress: () => void;
}

const InvitePartners: React.FC<InvitePartnersProps> = ({ partners, onInvitePress }) => {
  const renderItem = ({ item }: { item: Partner }) => (
    <View className="flex-row items-center bg-purple-200 rounded-lg p-3 mb-2">
      <Ionicons name="person-circle-outline" size={24} color="#5A4D6B" className="mr-2" />
      <Text className="text-purple-900 text-base">{item.name}</Text>
    </View>
  );

  return (
    <View className="bg-purple-300 rounded-xl p-4 w-72 items-center">
      <Text className="text-purple-800 text-lg font-semibold mb-4">Invite Partners</Text>
      <FlatList
        data={partners}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        className="self-stretch mb-4"
      />
      <TouchableOpacity
        className="bg-purple-400 py-3 px-8 rounded-lg"
        onPress={onInvitePress}
      >
        <Text className="text-white font-semibold text-base">INVITE</Text>
      </TouchableOpacity>
    </View>
  );
};

export default InvitePartners;
