// any constants put them here
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive font size utility
export const scaleFont = (size: number): number => {
  const scale = SCREEN_WIDTH / 375; // Base width (iPhone X)
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Responsive dimension utility
export const scaleSize = (size: number): number => {
  const scale = SCREEN_WIDTH / 375; // Base width (iPhone X)
  return Math.round(size * scale);
};