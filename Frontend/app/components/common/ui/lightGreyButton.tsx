import React from 'react'
import { Pressable, Text } from 'react-native'

interface lightGreyButtonProps {
    onPress: () => void;
    text: string;
    style?: object;
    textStyle?: object;  // Add this line

}

const lightGreyButton: React.FC<lightGreyButtonProps> = ({
    onPress,
    text,
    style,
    textStyle
}) => {
    return (
        <Pressable
            onPress={onPress}
            className="rounded-[30px] bg-gray-500 flex-row items-center justify-center"
            style={[{ 
                width: '125px',
                height: '40px'
            }, style]} 
        >
            <Text className="text-[16px] font-wix text-white text-center"
                style={[{ color: 'white' }, textStyle]}
            >
                {text}
            </Text>
        </Pressable>
    )
}

export default lightGreyButton;