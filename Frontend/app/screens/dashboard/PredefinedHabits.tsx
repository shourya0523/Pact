import React from 'react';
import { View, Text, Alert, ScrollView, StyleSheet } from 'react-native';
import Particles from '../../components/common/ui/starsParticlesBackground';
import HabitShadowCircle from '../../components/common/ui/habitShadowCircle';
import GreyButton from '../../components/common/ui/greyButton';
import BackwardButton from '../../components/common/ui/backwardButton';
import { useRouter } from 'expo-router';

export default function PredefinedHabits() {
  const router = useRouter();

  const handleHabitPress = (habitName: string) => {
    console.log('=== HABIT PRESSED ===');
    console.log('Habit:', habitName);
    
    try {
      console.log('Navigating to StudyHabit...');
      router.push('/screens/dashboard/StudyHabit');
      console.log('Navigation successful');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate: ' + error);
    }
  };

  const chooseHabitPress = () => {
    console.log('=== CREATE OWN HABIT PRESSED ===');
    
    try {
      console.log('Navigating to StudyHabit...');
      router.push('/screens/dashboard/StudyHabit');
      console.log('Navigation successful');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate: ' + error);
    }
  };

  return (
    <View style={styles.container}>
      <Particles />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BackwardButton />

        <Text style={styles.title}>
          Choose from Predefined{'\n'}Productivity Habits
        </Text>
        
        <View style={styles.habitsContainer}>
          <View style={styles.row}>
            <HabitShadowCircle 
              label="Study Everyday"
              onPress={() => handleHabitPress('Study Everyday')}
            />
            <HabitShadowCircle
              label="Reduce Screen Time"
              onPress={() => handleHabitPress('Reduce Screen Time')}
            />
          </View>
          
          <View style={styles.row}>
            <HabitShadowCircle
              label="Wake up Early"
              onPress={() => handleHabitPress('Wake up Early')}
            />
            <HabitShadowCircle
              label="Stop Procrastinating"
              onPress={() => handleHabitPress('Stop Procrastinating')}
            />
          </View>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <View style={styles.buttonContainer}>
            <GreyButton
              onPress={chooseHabitPress}
              text="CREATE YOUR OWN HABIT"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#291133',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'WixMadeforText-Regular',
    fontSize: 32,
    textAlign: 'center',
    color: 'white',
    marginBottom: 40,
    marginTop: 20,
    lineHeight: 40,
  },
  habitsContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 400,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  footer: {
    marginTop: 40,
  },
  dividerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'white',
  },
  dividerText: {
    marginHorizontal: 16,
    color: 'white',
    fontFamily: 'WixMadeforText-Regular',
    fontSize: 14,
  },
  buttonContainer: {
    alignItems: 'center',
  },
});
