import React from 'react'
import { TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

const backwardButton = () => {
    const router = useRouter();

    const handleGoBack = () => {
        router.back();
    };

    return (
        <TouchableOpacity
            onPress={handleGoBack}
            className="border-white rounded-full"
        />
    )
}

export default backwardButton;