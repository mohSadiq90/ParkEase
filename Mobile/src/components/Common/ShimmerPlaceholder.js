/**
 * ShimmerPlaceholder Component & Skeleton Loaders
 * Reusable animated shimmer effect for loading states across all screens.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Base animated shimmer placeholder primitive.
 * Smoothly pulses opacity to give a polished loading shimmer effect.
 */
export const ShimmerPlaceholder = ({
    width = '100%',
    height = 16,
    borderRadius = 6,
    style,
    duration = 900,
    baseColor = '#E2E8F0',
    highlightColor = '#F8FAFC',
    children,
    testID = 'shimmer-placeholder',
    ...props
}) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [animatedValue, duration]);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.35, 0.85],
    });

    return (
        <View
            style={[
                styles.placeholder,
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: baseColor,
                },
                style,
            ]}
            testID={testID}
            {...props}
        >
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: highlightColor,
                        borderRadius,
                        opacity,
                    },
                ]}
            />
            {children}
        </View>
    );
};

/**
 * Shimmer skeleton for listing, booking, and search cards.
 */
export const CardSkeleton = ({ style, testID = 'card-skeleton' }) => (
    <View style={[styles.cardContainer, style]} testID={testID}>
        <View style={styles.cardHeader}>
            <ShimmerPlaceholder
                width={52}
                height={52}
                borderRadius={8}
                style={styles.thumbnail}
                testID={`${testID}-thumb`}
            />
            <View style={styles.headerText}>
                <ShimmerPlaceholder
                    width="65%"
                    height={16}
                    borderRadius={4}
                    style={{ marginBottom: 8 }}
                    testID={`${testID}-title`}
                />
                <ShimmerPlaceholder
                    width="40%"
                    height={12}
                    borderRadius={4}
                    testID={`${testID}-subtitle`}
                />
            </View>
        </View>
        <View style={styles.cardBody}>
            <ShimmerPlaceholder
                width="100%"
                height={12}
                borderRadius={4}
                style={{ marginBottom: 8 }}
            />
            <ShimmerPlaceholder width="80%" height={12} borderRadius={4} />
        </View>
        <View style={styles.cardFooter}>
            <ShimmerPlaceholder width={75} height={28} borderRadius={6} />
            <ShimmerPlaceholder width={75} height={28} borderRadius={6} />
            <ShimmerPlaceholder width={75} height={28} borderRadius={6} />
        </View>
    </View>
);

/**
 * Shimmer list skeleton rendering multiple card placeholders.
 */
export const ListSkeleton = ({ count = 3, style, testID = 'list-skeleton' }) => (
    <View style={[styles.listContainer, style]} testID={testID}>
        {Array.from({ length: count }).map((_, index) => (
            <CardSkeleton key={`skeleton-item-${index}`} style={styles.listItem} testID={`skeleton-card-${index}`} />
        ))}
    </View>
);

/**
 * Detail screen skeleton (parking detail, booking detail).
 */
export const DetailSkeleton = ({ style, testID = 'detail-skeleton' }) => (
    <View style={[styles.detailContainer, style]} testID={testID}>
        <ShimmerPlaceholder
            width="100%"
            height={220}
            borderRadius={0}
            style={styles.detailHero}
            testID={`${testID}-hero`}
        />
        <View style={styles.detailContent}>
            <View style={styles.detailHeaderRow}>
                <ShimmerPlaceholder width="60%" height={22} borderRadius={6} />
                <ShimmerPlaceholder width="25%" height={22} borderRadius={6} />
            </View>
            <ShimmerPlaceholder width="45%" height={14} borderRadius={4} style={{ marginTop: 8, marginBottom: 16 }} />
            <View style={styles.chipRow}>
                <ShimmerPlaceholder width={65} height={26} borderRadius={13} style={{ marginRight: 8 }} />
                <ShimmerPlaceholder width={75} height={26} borderRadius={13} style={{ marginRight: 8 }} />
                <ShimmerPlaceholder width={60} height={26} borderRadius={13} />
            </View>
            <View style={{ marginTop: 24 }}>
                <ShimmerPlaceholder width="100%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <ShimmerPlaceholder width="95%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <ShimmerPlaceholder width="70%" height={14} borderRadius={4} />
            </View>
            <ShimmerPlaceholder width="100%" height={140} borderRadius={12} style={{ marginTop: 24 }} />
        </View>
    </View>
);

/**
 * Dashboard screen skeleton with KPI grid and list cards.
 */
export const DashboardSkeleton = ({ style, testID = 'dashboard-skeleton' }) => (
    <View style={[styles.dashboardContainer, style]} testID={testID}>
        <View style={styles.dashboardHeader}>
            <ShimmerPlaceholder width="50%" height={22} borderRadius={6} style={{ marginBottom: 8 }} />
            <ShimmerPlaceholder width="35%" height={14} borderRadius={4} />
        </View>
        <View style={styles.kpiGrid}>
            <View style={styles.kpiRow}>
                <ShimmerPlaceholder width="48%" height={85} borderRadius={12} style={styles.kpiCard} />
                <ShimmerPlaceholder width="48%" height={85} borderRadius={12} style={styles.kpiCard} />
            </View>
            <View style={[styles.kpiRow, { marginTop: 12 }]}>
                <ShimmerPlaceholder width="48%" height={85} borderRadius={12} style={styles.kpiCard} />
                <ShimmerPlaceholder width="48%" height={85} borderRadius={12} style={styles.kpiCard} />
            </View>
        </View>
        <ShimmerPlaceholder width="100%" height={52} borderRadius={12} style={{ marginTop: 20 }} />
        <View style={{ marginTop: 24 }}>
            <ShimmerPlaceholder width="40%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
            <CardSkeleton />
            <CardSkeleton style={{ marginTop: 12 }} />
        </View>
    </View>
);

/**
 * Chat thread skeleton showing alternating incoming and outgoing message bubbles.
 */
export const ChatThreadSkeleton = ({ style, testID = 'chat-thread-skeleton' }) => (
    <View style={[styles.chatThreadContainer, style]} testID={testID}>
        <View style={styles.chatDateDivider}>
            <ShimmerPlaceholder width={90} height={20} borderRadius={10} testID={`${testID}-date`} />
        </View>

        {/* Incoming message bubble 1 */}
        <View style={styles.incomingRow}>
            <ShimmerPlaceholder width={32} height={32} borderRadius={16} style={styles.chatAvatar} testID={`${testID}-avatar-0`} />
            <View style={styles.incomingBubble}>
                <ShimmerPlaceholder width="55%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="35%" height={10} borderRadius={4} />
            </View>
        </View>

        {/* Outgoing message bubble 1 */}
        <View style={styles.outgoingRow}>
            <View style={styles.outgoingBubble}>
                <ShimmerPlaceholder width="65%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="40%" height={10} borderRadius={4} />
            </View>
        </View>

        {/* Incoming message bubble 2 (longer) */}
        <View style={styles.incomingRow}>
            <ShimmerPlaceholder width={32} height={32} borderRadius={16} style={styles.chatAvatar} testID={`${testID}-avatar-1`} />
            <View style={[styles.incomingBubble, { width: '75%' }]}>
                <ShimmerPlaceholder width="100%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="45%" height={10} borderRadius={4} />
            </View>
        </View>

        {/* Outgoing message bubble 2 (shorter) */}
        <View style={styles.outgoingRow}>
            <View style={[styles.outgoingBubble, { width: '45%' }]}>
                <ShimmerPlaceholder width="100%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="50%" height={10} borderRadius={4} />
            </View>
        </View>

        {/* Incoming message bubble 3 */}
        <View style={styles.incomingRow}>
            <ShimmerPlaceholder width={32} height={32} borderRadius={16} style={styles.chatAvatar} testID={`${testID}-avatar-2`} />
            <View style={[styles.incomingBubble, { width: '60%' }]}>
                <ShimmerPlaceholder width="100%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="40%" height={10} borderRadius={4} />
            </View>
        </View>

        {/* Outgoing message bubble 3 */}
        <View style={styles.outgoingRow}>
            <View style={[styles.outgoingBubble, { width: '68%' }]}>
                <ShimmerPlaceholder width="100%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="55%" height={10} borderRadius={4} />
            </View>
        </View>
    </View>
);

/**
 * Single conversation item skeleton placeholder for recent chats list.
 */
export const ConversationItemSkeleton = ({ style, testID = 'conversation-item-skeleton' }) => (
    <View style={[styles.convItemContainer, style]} testID={testID}>
        <ShimmerPlaceholder width={48} height={48} borderRadius={24} style={styles.convAvatar} testID={`${testID}-avatar`} />
        <View style={styles.convContent}>
            <View style={styles.convHeaderRow}>
                <ShimmerPlaceholder width="42%" height={15} borderRadius={4} testID={`${testID}-name`} />
                <ShimmerPlaceholder width="18%" height={11} borderRadius={4} testID={`${testID}-time`} />
            </View>
            <ShimmerPlaceholder width="50%" height={11} borderRadius={4} style={{ marginTop: 6 }} testID={`${testID}-badge`} />
            <View style={styles.convPreviewRow}>
                <ShimmerPlaceholder width="75%" height={12} borderRadius={4} testID={`${testID}-preview`} />
                <ShimmerPlaceholder width={18} height={18} borderRadius={9} testID={`${testID}-unread`} />
            </View>
        </View>
    </View>
);

/**
 * Conversation list skeleton.
 */
export const ConversationListSkeleton = ({ count = 5, style, testID = 'conversation-list-skeleton' }) => (
    <View style={[styles.convListContainer, style]} testID={testID}>
        {Array.from({ length: count }).map((_, index) => (
            <ConversationItemSkeleton key={`conv-skeleton-${index}`} testID={`conv-item-${index}`} />
        ))}
    </View>
);

/**
 * Single review item skeleton placeholder.
 */
export const ReviewItemSkeleton = ({ style, testID = 'review-item-skeleton' }) => (
    <View style={[styles.reviewCardContainer, style]} testID={testID}>
        <View style={styles.reviewHeaderRow}>
            <ShimmerPlaceholder width={38} height={38} borderRadius={19} style={{ marginRight: 10 }} testID={`${testID}-avatar`} />
            <View style={{ flex: 1 }}>
                <ShimmerPlaceholder width="40%" height={14} borderRadius={4} style={{ marginBottom: 4 }} testID={`${testID}-name`} />
                <ShimmerPlaceholder width="20%" height={11} borderRadius={4} testID={`${testID}-date`} />
            </View>
            <ShimmerPlaceholder width={60} height={14} borderRadius={4} testID={`${testID}-stars`} />
        </View>
        <View style={{ marginTop: 10 }}>
            <ShimmerPlaceholder width="95%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
            <ShimmerPlaceholder width="75%" height={12} borderRadius={4} />
        </View>
    </View>
);

/**
 * Review list skeleton.
 */
export const ReviewListSkeleton = ({ count = 4, style, testID = 'review-list-skeleton' }) => (
    <View style={[styles.reviewListContainer, style]} testID={testID}>
        {Array.from({ length: count }).map((_, index) => (
            <ReviewItemSkeleton key={`review-skeleton-${index}`} testID={`review-item-${index}`} />
        ))}
    </View>
);

/**
 * ScreenShimmer: High-level wrapper that conditionally displays the skeleton loader.
 */
export const ScreenShimmer = ({
    loading = true,
    type = 'list',
    count = 3,
    children,
    style,
    testID = 'screen-shimmer',
}) => {
    if (loading) {
        if (type === 'chat') {
            return <ChatThreadSkeleton style={style} testID={testID} />;
        }
        if (type === 'conversation') {
            return <ConversationListSkeleton count={count} style={style} testID={testID} />;
        }
        if (type === 'review') {
            return <ReviewListSkeleton count={count} style={style} testID={testID} />;
        }
        if (type === 'detail') {
            return <DetailSkeleton style={style} testID={testID} />;
        }
        if (type === 'dashboard') {
            return <DashboardSkeleton style={style} testID={testID} />;
        }
        return <ListSkeleton count={count} style={style} testID={testID} />;
    }
    return children || null;
};

const styles = StyleSheet.create({
    placeholder: {
        overflow: 'hidden',
        position: 'relative',
    },
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    thumbnail: {
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    cardBody: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 8,
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    listItem: {
        marginBottom: 12,
    },
    detailContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    detailHero: {
        marginBottom: 16,
    },
    detailContent: {
        paddingHorizontal: 16,
    },
    detailHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dashboardContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    dashboardHeader: {
        marginBottom: 16,
    },
    kpiGrid: {
        width: '100%',
    },
    kpiRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    kpiCard: {
        overflow: 'hidden',
    },
    // Chat thread skeleton styles
    chatThreadContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    chatDateDivider: {
        alignItems: 'center',
        marginVertical: 10,
    },
    incomingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 14,
    },
    chatAvatar: {
        marginRight: 8,
        marginBottom: 2,
    },
    incomingBubble: {
        width: '62%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    outgoingRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 14,
    },
    outgoingBubble: {
        width: '58%',
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        borderBottomRightRadius: 4,
        padding: 12,
        borderWidth: 1,
        borderColor: '#DBEAFE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    // Conversation list skeleton styles
    convListContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    convItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    convAvatar: {
        marginRight: 12,
    },
    convContent: {
        flex: 1,
    },
    convHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    convPreviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    // Review list skeleton styles
    reviewListContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    reviewCardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    reviewHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default ShimmerPlaceholder;
