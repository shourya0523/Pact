import React, { useState } from 'react'
import { useRouter } from 'expo-router';
import { Text, Image, View, TouchableOpacity, TextInput, StyleSheet } from "react-native";
//testing testing

export default function LinkScreen(): React.JSX.Element {
    const router = useRouter();
    const [link, setLink] = useState('')

    const handleCopyLink = () => {
        console.log('Link copied')
        // TODO: Implement actual link copy functionality
    }
    
    return (
        <View style={styles.container}>
            {/* Stars background */}
            <View style={styles.starsContainer}>
                {[...Array(50)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.star,
                            {
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: Math.random() * 3 + 1,
                                height: Math.random() * 3 + 1,
                                opacity: Math.random() * 0.7 + 0.3,
                            }
                        ]}
                    />
                ))}
            </View>

            <View style={styles.content}>
                <View style={styles.topSection}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={require('../../images/space/planet-big.png')}
                            style={styles.planetImage}
                            resizeMode='contain'
                        />
                    </View>

                    <Text style={styles.title}>
                        Don't track your habits{'\n'}alone!
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Partner Link"
                            placeholderTextColor="#7C3AED"
                            value={link}
                            onChangeText={setLink}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.copyButton}
                        activeOpacity={0.8}
                        onPress={handleCopyLink}
                    >
                        <View style={styles.copyIcon}>
                            <View style={styles.copyIconBack} />
                            <View style={styles.copyIconFront} />
                        </View>
                        <Text style={styles.copyButtonText}>
                            COPY LINK
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomSection}>
                    <TouchableOpacity
                        style={styles.continueButton}
                        activeOpacity={0.8}
                        onPress={() => router.push('/screens/onboarding/HabitSetupScreen')}
                    >
                        <Text style={styles.continueButtonText}>
                            CONTINUE
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#291133',
    },
    starsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    star: {
        position: 'absolute',
        backgroundColor: 'white',
        borderRadius: 999,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 64,
        paddingBottom: 32,
    },
    topSection: {
        alignItems: 'center',
    },
    imageContainer: {
        marginBottom: 48,
    },
    planetImage: {
        width: 320,
        height: 320,
    },
    title: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 16,
    },
    input: {
        width: '100%',
        backgroundColor: 'rgba(196, 181, 253, 0.9)',
        borderRadius: 25,
        paddingHorizontal: 24,
        paddingVertical: 16,
        color: '#581c87',
        fontSize: 16,
    },
    copyButton: {
        backgroundColor: 'rgba(126, 34, 206, 0.8)',
        borderRadius: 25,
        paddingHorizontal: 32,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    copyIcon: {
        width: 20,
        height: 20,
        marginRight: 8,
        position: 'relative',
    },
    copyIconBack: {
        position: 'absolute',
        top: 0,
        left: 4,
        width: 12,
        height: 16,
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 2,
    },
    copyIconFront: {
        position: 'absolute',
        bottom: 0,
        right: 4,
        width: 12,
        height: 16,
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 2,
        backgroundColor: 'rgba(126, 34, 206, 0.8)',
    },
    copyButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
    },
    bottomSection: {
        width: '100%',
    },
    continueButton: {
        width: '100%',
        backgroundColor: 'rgba(107, 33, 168, 0.6)',
        borderRadius: 25,
        paddingVertical: 16,
        alignItems: 'center',
    },
    continueButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 1,
    },
});
