import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  type?: 'text' | 'email' | 'password';
  showCheckmark?: boolean;
  className?: string;
}

export default function Input({
  value,
  onChangeText,
  placeholder,
  type = 'text',
  showCheckmark = true,
  className = '',
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const isEmail = type === 'email';

  return (
    <View className={`relative mb-4 ${className}`}>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        className="bg-white/90 rounded-2xl py-4 px-5 text-base text-gray-700"
        placeholderTextColor="#6B7280"
        secureTextEntry={isPassword && !showPassword}
        keyboardType={isEmail ? 'email-address' : 'default'}
        autoCapitalize={isEmail ? 'none' : 'sentences'}
        {...props}
      />

      {showCheckmark && value.length > 0 && !isPassword && (
        <View className="absolute right-4 top-4">
          <Ionicons name="checkmark" size={20} color="#10B981" />
        </View>
      )}

      {isPassword && (
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-4"
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}