import React from 'react'
import { Pressable, Text } from 'react-native'

interface purpleGreyButtonProps {
    onPress: () => void;
    text: string;
    style?: object;
}

const purpleGreyButton: React.FC<purpleGreyButtonProps> = ({
    onPress,
    text,
    style
}) => {
    return (
        <Pressable
            onPress={onPress}
            className="rounded-[30px] flex-row items-center justify-center"
            style={[{ 
                backgroundColor: "rgba(210, 86, 217, 0.27)",
                width: '160px',
                height: '55px'
            }, style]} 
        >
            <Text className="text-[16px] font-wix text-white text-center">
                {text}
            </Text>
        </Pressable>
    )
}

export default purpleGreyButton;