import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TouchableWithoutFeedback, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../../../config';
import PartnerBox from '../ui/partnerBox';

interface Partner {
  id: string;
  name: string;
  username: string;
  email: string;
}

interface InvitePartnersProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (type: any) => void;
}

const InvitePartners: React.FC<InvitePartnersProps> = ({
  visible,
  onClose,
  onSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

  if (!visible) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Enter Username", "Please enter a username to search.");
      return;
    }

    setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const BASE_URL = await getBaseUrl();
      
      // Search for users by username
      const response = await fetch(`${BASE_URL}/api/users/search?username=${searchQuery}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const users = await response.json();
        setSearchResults(users.map((u: any) => ({
          id: u.id,
          name: u.display_name || u.username,
          username: u.username,
          email: u.email
        })));
      } else {
        setSearchResults([]);
        Alert.alert("No Results", "No users found with that username.");
      }
    } catch (err) {
      console.error('Search error:', err);
      Alert.alert("Error", "Unable to search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (partnerUsername: string) => {
    setSelectedPartner(partnerUsername);
    
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const BASE_URL = await getBaseUrl();
      
      const response = await fetch(`${BASE_URL}/api/partnerships/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ partner_username: partnerUsername })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Partnership Created! 🎉",
          `You're now partnered with ${data.partnership.partner_username}!`
        );
        onClose();
      } else {
        Alert.alert("Failed", data.detail || "Unable to create partnership.");
      }
    } catch (err) {
      console.error('Invite error:', err);
      Alert.alert("Error", "Unable to send invite.");
    } finally {
      setSelectedPartner(null);
    }
  };

  const renderItem = ({ item }: { item: Partner }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between bg-white/20 rounded-lg p-3 mb-2 w-full"
      onPress={() => handleInvite(item.username)}
      disabled={selectedPartner === item.username}
    >
      <View className="flex-row items-center">
        <Ionicons name="person-circle-outline" size={24} color="#FFFFFF" className="mr-2" />
        <View>
          <Text className="text-white text-base font-semibold">{item.name}</Text>
          <Text className="text-white/70 text-sm">@{item.username}</Text>
        </View>
      </View>
      {selectedPartner === item.username ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Ionicons name="add-circle" size={24} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View className="absolute inset-0 justify-center items-center bg-black/50">
        <TouchableWithoutFeedback>
          <View className="bg-[#9A84A2] rounded-2xl p-6 w-80 max-h-[500px]">
            <Text className="text-[#291133] text-[32px] font-semibold mb-4 text-center">
              Invite Partners
            </Text>

            <TextInput
              className="bg-white/90 rounded-xl p-3 mb-3"
              placeholder="Search username..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />

            <TouchableOpacity
              className="bg-[#291133] py-2 px-6 rounded-xl mb-4"
              onPress={handleSearch}
              disabled={loading}
            >
              <Text className="text-white font-semibold text-center">
                {loading ? "SEARCHING..." : "SEARCH"}
              </Text>
            </TouchableOpacity>

            <ScrollView className="mb-4" style={{ maxHeight: 250 }}>
              {loading ? (
                <ActivityIndicator size="large" color="#291133" />
              ) : searchResults.length > 0 ? (
                searchResults.map((partner) => (
                  <View key={partner.id}>
                    {renderItem({ item: partner })}
                  </View>
                ))
              ) : (
                <Text className="text-white/70 text-center py-4">
                  Search for users to invite
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              className="bg-white/20 py-2 px-8 rounded-xl"
              onPress={onClose}
            >
              <Text className="text-white font-semibold text-center">CLOSE</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default InvitePartners;