import React from 'react';
import { View, Text, ImageSourcePropType, Image, StyleSheet } from 'react-native'

type HabitsBoxProps = {
    name: string;
    percentage: number;
    image?: ImageSourcePropType;
};

const HabitsBox: React.FC<HabitsBoxProps> = ({ name, percentage, image}) => {
    return (
        <View style={styles.container}>
            {image && <Image source={image} />}
            <Text style={styles.habitText}>{name}</Text>
            <Text style={styles.habitDescription}>{percentage}%</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white', 
        borderRadius: 32,
        borderWidth: 5,
        borderColor: '#C3CCD9',
        padding: 16,
        width: 200,
        height: 250,
        margin: 10,
        display: 'flex',
        justifyContent: "center",
    },

    habitText: {
        fontSize: 20,
    },

    habitDescription: {
        fontSize: 16
    }
})

export default HabitsBox;