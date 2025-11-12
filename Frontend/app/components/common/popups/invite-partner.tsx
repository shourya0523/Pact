import React from 'react';
import { View, Text, TouchableOpacity, FlatList, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PartnerBox from '@/components/ui/partnerBox'; // adjust path if needed

interface Partner {
  id: string;
  name: string;
}

interface InvitePartnersProps {
  visible: boolean;
  partners?: Partner[];
  onInvitePress: () => void;
  onClose: () => void;
}

const InvitePartners: React.FC<InvitePartnersProps> = ({
  visible,
  partners = [],
  onInvitePress,
  onClose,
}) => {
  if (!visible) return null;

  const renderItem = ({ item }: { item: Partner }) => (
    <View className="flex-row items-center bg-purple-100 rounded-lg p-3 mb-2 w-full">
      <Ionicons name="person-circle-outline" size={24} color="#5A4D6B" className="mr-2" />
      <Text className="text-purple-900 text-base">{item.name}</Text>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View className="absolute inset-0 justify-center items-center bg-black/50">
        <TouchableWithoutFeedback>
          <View className="bg-[#9A84A2] rounded-2xl p-6 w-80">
            <Text className="text-[#291133] text-[32px] font-semibold mb-4 text-center">
              Invite Partners
            </Text>

            {/* 3 PartnerBoxes */}
            <ScrollView className="mb-4">
              {partners.slice(0, 3).map((partner) => (
                <PartnerBox key={partner.id} partner={partner.name} />
              ))}

              {/* Remaining partners in FlatList */}
              {partners.length > 3 && (
                <FlatList
                  data={partners.slice(3)}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  className="self-stretch mt-2"
                />
              )}
            </ScrollView>

            {/* Only INVITE button */}
            <TouchableOpacity
              className="bg-[#291133] py-3 px-8 rounded-3xl w-full"
              onPress={onInvitePress}
            >
              <Text className="text-white font-semibold text-center">INVITE</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default InvitePartners;
