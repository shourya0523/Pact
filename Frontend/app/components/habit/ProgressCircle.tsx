import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressCircleProps {
  size?: number;
  strokeWidth?: number;
  progress: number;
  backgroundColor?: string;
  progressColor?: string;
  innerColor?: string; // fill inside circle
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  size = 120,
  strokeWidth = 12,
  progress,
  backgroundColor = '#D1FAE5',
  progressColor = '#10B981',
  innerColor = '#FFFFFF',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View className="items-center justify-center">
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Inner white fill */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={innerColor}
        />
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring with sharp edges */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="butt" // sharp edges instead of round
        />
      </Svg>
      {/* Progress text */}
      <View className="absolute items-center justify-center">
        <Text className="text-[11px] text-gray-800">
          {Math.round(progress)}%
        </Text>
      </View>
    </View>
  );
};

export default ProgressCircle;
