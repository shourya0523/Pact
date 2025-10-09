import { TouchableOpacity, Text } from 'react-native';

export default function CircularButton() {
    return (
        <TouchableOpacity 
            className="w-20 h-20 rounded-full bg-[#BAC3D1] items-center justify-center"
        >
            <Text className="text-5xl text-white font-bold bottom-1.5">+</Text>
        </TouchableOpacity>
    );
};