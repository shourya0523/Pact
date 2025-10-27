import React from 'react'
import { Pressable, Text } from 'react-native'

interface greyButtonProps {
    onPress: () => void;
    text: string;
}

const greyButton: React.FC<greyButtonProps> = ({
    onPress,
    text
}) => {
    return (
        <Pressable
            onPress={onPress}
            className="w-[480px] h-[60px] rounded-[30px] flex-row items-center justify-center"
            style={{ backgroundColor: "rgba(129, 132, 152, 0.27)" }} 
        >
            <Text className="text-[16px] font-wix text-white text-center">
                {text}
            </Text>
        </Pressable>
    )
}

export default greyButton;