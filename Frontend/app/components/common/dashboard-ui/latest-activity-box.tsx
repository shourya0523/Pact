import React from 'react';
import { View, Text, ImageSourcePropType, Image, StyleSheet } from 'react-native'

type ActivityBoxProps = {
    activityAction: string;
    activityTime: string;
    image?: ImageSourcePropType;
};

const ActivityBox: React.FC<ActivityBoxProps> = ({ activityAction, activityTime, image }) => {
    return (
        <View style={styles.container} >
            {image && <Image source={image} />}
            <Text style={styles.actionText}>{activityAction}</Text>
            <Text style={styles.timeText}>{activityTime}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        width: 200,
        height: 80,
        margin: 10,
        display: 'flex',
        justifyContent: "center"
    },

    actionText: {
        fontSize: 18,
    },

    timeText: {
        color: 'gray',
        fontSize: 12,
    }
})

export default ActivityBox;