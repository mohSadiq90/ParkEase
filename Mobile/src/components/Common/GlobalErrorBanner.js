import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows } from '../../styles/globalStyles';
import { EventBus } from '../../utils/EventBus';

/**
 * GlobalErrorBanner Component
 * 
 * Renders an auto-disappearing banner at the top of the screen.
 * Listens for 'SHOW_BANNER' and 'SHOW_ERROR_BANNER' events triggered via EventBus.
 * Used for foreground push notification banners and in-app feedback toasts.
 * 
 * @component
 * @example
 * EventBus.emit('SHOW_BANNER', { title: 'New Message', message: 'You have a new message', type: 'info' });
 * 
 * @returns {React.ReactElement|null} The banner component
 */
const GlobalErrorBanner = () => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('Something went wrong. Please try again later.');
    const [title, setTitle] = useState('Oops!');
    const [type, setType] = useState('error'); // 'error', 'success', 'info'
    
    const translateY = useRef(new Animated.Value(-150)).current;
    const insets = useSafeAreaInsets();
    const timerRef = useRef(null);
    
    useEffect(() => {
        const handleShowBanner = (data) => {
            setTitle(data?.title || (data?.type === 'success' ? 'Success' : (data?.type === 'info' ? 'Notification' : 'Oops!')));
            setMessage(data?.message || 'Something happened. Please try again.');
            setType(data?.type || 'error');
            
            setVisible(true);
            
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                speed: 12,
                bounciness: 4,
            }).start();
            
            timerRef.current = setTimeout(() => {
                hideBanner();
            }, 4000);
        };
        
        EventBus.on('SHOW_BANNER', handleShowBanner);
        EventBus.on('SHOW_ERROR_BANNER', handleShowBanner);
        return () => {
            EventBus.off('SHOW_BANNER', handleShowBanner);
            EventBus.off('SHOW_ERROR_BANNER', handleShowBanner);
        };
    }, [translateY]);
    
    const hideBanner = () => {
        Animated.timing(translateY, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false);
        });
    };
    
    const getIcon = () => {
        switch(type) {
            case 'success': return 'checkmark-circle-outline';
            case 'info': return 'information-circle-outline';
            default: return 'warning-outline';
        }
    };

    const getBackgroundColor = () => {
        switch(type) {
            case 'success': return colors.success;
            case 'info': return colors.primary;
            default: return colors.danger;
        }
    };
    
    if (!visible) return null;

    const paddingTop = insets.top > 0 ? insets.top + 10 : (Platform.OS === 'android' ? 40 : 20);
    
    return (
        <Animated.View style={[
            styles.container, 
            { transform: [{ translateY }], paddingTop, backgroundColor: getBackgroundColor() }
        ]}>
            <TouchableOpacity activeOpacity={0.9} onPress={hideBanner} style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name={getIcon()} size={24} color={colors.white} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    <Text style={styles.message} numberOfLines={2}>{message}</Text>
                </View>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        paddingBottom: 16,
        paddingHorizontal: 20,
        ...shadows.lg,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        ...typography.label,
        color: colors.white,
        marginBottom: 2,
    },
    message: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 18,
    },
});

export default GlobalErrorBanner;
