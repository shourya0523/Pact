import React from 'react';
import { View, StyleSheet } from 'react-native';

const Particles: React.FC = () => {
  // Generate random stars
  const stars = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    opacity: Math.random() * 0.7 + 0.3,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {stars.map((star) => (
        <View
          key={star.id}
          style={[
            styles.star,
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#291133',
    zIndex: -1,
  },
  star: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 999,
  },
});

export default Particles;
