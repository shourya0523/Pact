import React from 'react'
import { Pressable, Text } from 'react-native'

interface greyButtonProps {
    onPress: () => void;
    text: string;
    style?: object;
    disabled?: boolean;
}

const greyButton: React.FC<greyButtonProps> = ({
    onPress,
    text,
    style,
    disabled = false
}) => {
    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            className="rounded-[30px] flex-row items-center justify-center"
            style={[{ 
                backgroundColor: "rgba(129, 132, 152, 0.27)", 
                width: '440px',
                height: '65px',
                opacity: disabled ? 0.5 : 1
            }, style]} 
        >
            <Text className="text-[16px] font-wix text-white text-center">
                {text}
            </Text>
        </Pressable>
    )
}

export default greyButton;