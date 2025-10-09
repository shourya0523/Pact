import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ViewProps } from "react-native";
import { theme } from "../../../assets/theme"

type GradientBackgroundProps = ViewProps & {
    children: React.ReactNode
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style, ...props }) => {
    return (
        <LinearGradient 
            colors={[theme.colors.backgroundGradientStart, theme.colors.backgroundGradientEnd]}
            start={{ x: 0, y: 0}}
            end={{ x: 1, y: 0}}
            className="flex-1"
            style={style}
            {...props}
        >
            {children}
        </LinearGradient>
    )
}
export default GradientBackground;