/**
 * SplashScreen Component (Launch Screen)
 * Branded launch screen displayed during initial app startup while session is being verified.
 * Replaces generic loading spinner with polished ParkEase brand identity.
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../styles/globalStyles';

const { width } = Dimensions.get('window');

const SplashScreen = ({
    tagline = 'Smart Parking Made Effortless',
    version = 'v1.0.0',
    testID = 'splash-screen',
}) => {
    const insets = useSafeAreaInsets();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.88)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade & spring scale-in the brand emblem
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        // Subtle ambient breathing pulse around the brand emblem
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.12,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        // Sleek horizontal indeterminate launch progress bar
        const progress = Animated.loop(
            Animated.sequence([
                Animated.timing(progressAnim, {
                    toValue: 1,
                    duration: 1400,
                    easing: Easing.inOut(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(progressAnim, {
                    toValue: 0,
                    duration: 1400,
                    easing: Easing.inOut(Easing.cubic),
                    useNativeDriver: true,
                }),
            ])
        );

        if (process.env.NODE_ENV !== 'test') {
            pulse.start();
            progress.start();
        }

        return () => {
            pulse.stop();
            progress.stop();
        };
    }, [fadeAnim, scaleAnim, pulseAnim, progressAnim]);

    const progressTranslateX = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-60, 60],
    });

    return (
        <View style={styles.container} testID={testID} accessibilityLabel="ParkEase Splash Screen">
            <StatusBar style="light" />
            <LinearGradient
                colors={colors.gradients.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Decorative ambient background rings */}
            <View style={[styles.bgRing, styles.bgRingLarge]} />
            <View style={[styles.bgRing, styles.bgRingSmall]} />

            {/* Main Brand Content */}
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Logo Emblem with ambient glow ring */}
                <View style={styles.logoContainer}>
                    <Animated.View
                        style={[
                            styles.glowRing,
                            {
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    />
                    <View style={styles.logoCircle}>
                        <Ionicons name="car-sport" size={54} color={colors.primary} />
                    </View>
                </View>

                {/* App Title & Tagline */}
                <Text style={styles.appName}>ParkEase</Text>
                <Text style={styles.tagline}>{tagline}</Text>

                {/* Elegant launch progress bar */}
                <View style={styles.progressTrack} testID="splash-progress-track">
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                transform: [{ translateX: progressTranslateX }],
                            },
                        ]}
                        testID="splash-progress-indicator"
                    />
                </View>
            </Animated.View>

            {/* Footer Branding / Version */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <Text style={styles.footerText}>Smart Parking Platform</Text>
                <Text style={styles.versionText}>{version}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E3A8A',
    },
    bgRing: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    bgRingLarge: {
        width: width * 1.5,
        height: width * 1.5,
        top: -width * 0.3,
    },
    bgRingSmall: {
        width: width * 0.9,
        height: width * 0.9,
        bottom: -width * 0.2,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    glowRing: {
        position: 'absolute',
        width: 114,
        height: 114,
        borderRadius: 57,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    logoCircle: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    appName: {
        fontSize: 38,
        fontWeight: '800',
        color: colors.white,
        letterSpacing: 1.5,
        textAlign: 'center',
        marginBottom: 6,
    },
    tagline: {
        ...typography.bodyMedium,
        color: 'rgba(255, 255, 255, 0.85)',
        textAlign: 'center',
        fontWeight: '500',
        letterSpacing: 0.4,
        marginBottom: spacing.xxl,
    },
    progressTrack: {
        width: 140,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressBar: {
        width: 50,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.white,
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        alignItems: 'center',
    },
    footerText: {
        ...typography.caption,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    versionText: {
        ...typography.caption,
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 11,
    },
});

export default SplashScreen;
export { SplashScreen, SplashScreen as LaunchScreen };
