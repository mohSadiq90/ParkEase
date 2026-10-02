/**
 * SwipeableRow
 * Reusable swipe-to-reveal gesture row using React Native PanResponder and Animated.
 * Ported incrementally from feature/chat-and-booking-management.
 */

import React, { useRef, useState } from 'react';
import {
    Animated,
    PanResponder,
    StyleSheet,
    View,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../styles/globalStyles';

const DEFAULT_ACTION_WIDTH = 70;

const SwipeableRow = ({
    children,
    onDelete,
    isDeleting = false,
    disabled = false,
    actionWidth = DEFAULT_ACTION_WIDTH,
    actionIcon = 'trash-outline',
    actionColor = colors.danger,
    renderRightAction,
    style,
    contentStyle,
    testID,
}) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [isOpen, setIsOpen] = useState(false);

    const swipeThreshold = -actionWidth;
    const snapThreshold = -actionWidth * 0.55;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                if (disabled || isDeleting) return false;
                // Only capture horizontal swipes exceeding threshold
                return (
                    Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
                    Math.abs(gestureState.dx) > 10
                );
            },
            onPanResponderMove: (_, gestureState) => {
                let newX = gestureState.dx;
                if (isOpen) {
                    newX = swipeThreshold + gestureState.dx;
                }

                // Prevent dragging right past original position
                if (newX > 0) newX = 0;
                // Bound left drag with dampening
                if (newX < swipeThreshold * 1.4) newX = swipeThreshold * 1.4;

                translateX.setValue(newX);
            },
            onPanResponderRelease: (_, gestureState) => {
                const currentX = isOpen ? swipeThreshold + gestureState.dx : gestureState.dx;

                if (currentX < snapThreshold) {
                    // Snap to Open
                    Animated.spring(translateX, {
                        toValue: swipeThreshold,
                        useNativeDriver: true,
                        bounciness: 6,
                    }).start();
                    setIsOpen(true);
                } else {
                    // Snap to Closed
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        friction: 6,
                    }).start();
                    setIsOpen(false);
                }
            },
        })
    ).current;

    const close = () => {
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
        setIsOpen(false);
    };

    const handleDelete = () => {
        if (isDeleting || disabled) return;
        if (onDelete) {
            onDelete();
        }
        close();
    };

    return (
        <View style={[styles.container, { backgroundColor: actionColor }, style]} testID={testID}>
            {/* Background Actions Layer */}
            <View style={[styles.actionsContainer, { width: actionWidth, backgroundColor: actionColor }]}>
                {renderRightAction ? (
                    renderRightAction({ close, isDeleting, handleDelete })
                ) : (
                    <TouchableOpacity
                        style={[styles.deleteButton, isDeleting && styles.disabledButton]}
                        onPress={handleDelete}
                        disabled={isDeleting || disabled}
                        activeOpacity={0.7}
                        testID={testID ? `${testID}-delete-btn` : 'swipeable-delete-btn'}
                        accessibilityRole="button"
                        accessibilityLabel="Delete item"
                    >
                        {isDeleting ? (
                            <ActivityIndicator color={colors.white} size="small" testID="swipeable-loading" />
                        ) : (
                            <Ionicons name={actionIcon} size={24} color={colors.white} />
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Foreground Content Layer */}
            <Animated.View
                style={[
                    styles.content,
                    contentStyle,
                    { transform: [{ translateX }] }
                ]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={isOpen ? close : undefined}
                    disabled={!isOpen}
                >
                    {children}
                </TouchableOpacity>
                {isDeleting && (
                    <View style={styles.deletingOverlay}>
                        <ActivityIndicator color={colors.primary} size="small" />
                    </View>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        borderRadius: spacing.cardRadius || 12,
        overflow: 'hidden',
    },
    actionsContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    content: {
        backgroundColor: colors.background || '#F8FAFC',
    },
    deletingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});

export default SwipeableRow;
