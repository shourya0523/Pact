import React from 'react'
import { Pressable, Text } from 'react-native'

interface greyButtonProps {
    onPress: () => void;
    text: string;
    style?: object;
}

const greyButton: React.FC<greyButtonProps> = ({
    onPress,
    text,
    style
}) => {
    return (
        <Pressable
            onPress={onPress}
            className="rounded-[30px] flex-row items-center justify-center"
            style={[{ 
                backgroundColor: "rgba(129, 132, 152, 0.27)", 
                width: '480px',
                height: '60px'
            }, style]} 
        >
            <Text className="text-[16px] font-wix text-white text-center">
                {text}
            </Text>
        </Pressable>
    )
}

export default greyButton;