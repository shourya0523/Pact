import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const BackwardButton: React.FC<{ size?: number; onPress?: () => void }> = ({
  size = 50,
  onPress,
}) => {
  const router = useRouter();

  const handleGoBack = () => {
    if (onPress) {
      onPress();
    } else {
      router.back(); 
    }
  };

  return (
    <TouchableOpacity
      onPress={handleGoBack}
      style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
      activeOpacity={0.7}
    >
      <Image
        source={require('app/images/misc/backArrow.png')}
        style={{ width: size * 0.35, height: size * 0.35 }} 
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 3, 
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BackwardButton;
