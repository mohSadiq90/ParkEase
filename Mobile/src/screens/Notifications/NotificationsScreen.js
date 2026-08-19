import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import EmptyState from '../../components/Common/EmptyState';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { 
    getNotificationsThunk, 
    markAsReadThunk, 
    markAllAsReadThunk, 
    deleteNotificationThunk,
    clearAllNotificationsThunk
} from '../../store/slices/notificationSlice';

const NotificationsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { items, loading, unreadCount } = useSelector(state => state.notification);

    useEffect(() => {
        dispatch(getNotificationsThunk());
    }, [dispatch]);

    const handleRefresh = useCallback(() => {
        dispatch(getNotificationsThunk());
    }, [dispatch]);

    const handleMarkAllRead = () => {
        if (unreadCount > 0) {
            dispatch(markAllAsReadThunk());
        }
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Notifications',
            'Are you sure you want to remove all notifications?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear All', style: 'destructive', onPress: () => dispatch(clearAllNotificationsThunk()) }
            ]
        );
    };

    const handleNotificationPress = (notification) => {
        if (!notification.isRead) {
            dispatch(markAsReadThunk(notification.id));
        }
        
        if (notification.referenceId || notification.bookingId) {
            navigation.navigate('BookingDetail', { bookingId: notification.referenceId || notification.bookingId });
        }
    };

    const handleDelete = (id) => {
        dispatch(deleteNotificationThunk(id));
    };

    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity 
                style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.titleContainer}>
                        {!item.isRead && <View style={styles.unreadDot} />}
                        <Text style={[styles.title, !item.isRead && styles.unreadText]}>
                            {item.title}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.message} numberOfLines={3}>
                    {item.message}
                </Text>
                <Text style={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleString()}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerRight}>
                    {items.length > 0 && unreadCount > 0 ? (
                        <TouchableOpacity onPress={handleMarkAllRead} style={{ marginRight: spacing.sm }}>
                            <Text style={styles.markReadText}>Mark read</Text>
                        </TouchableOpacity>
                    ) : null}
                    {items.length > 0 ? (
                        <TouchableOpacity onPress={handleClearAll}>
                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => (item.id || Math.random()).toString()}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl 
                        refreshing={loading} 
                        onRefresh={handleRefresh} 
                        tintColor={colors.primary}
                    />
                }
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    loading ? (
                        <LoadingScreen />
                    ) : (
                        <EmptyState
                            icon="notifications-off-outline"
                            title="No notifications"
                            message="You're all caught up! Important updates will appear here."
                        />
                    )
                }
            />
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.screenHorizontal,
        paddingTop: 60,
        paddingBottom: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.sm,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 50,
        justifyContent: 'flex-end',
    },
    markReadText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
    },
    listContainer: {
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: spacing['2xl'],
        flexGrow: 1,
    },
    notificationCard: {
        backgroundColor: colors.surface,
        borderRadius: spacing.radius.lg,
        padding: spacing.base,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    unreadCard: {
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xs,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: spacing.sm,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginRight: spacing.xs,
    },
    title: {
        ...typography.label,
        color: colors.textPrimary,
    },
    unreadText: {
        fontWeight: '700',
        color: colors.textPrimary,
    },
    deleteButton: {
        padding: 2,
    },
    message: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: spacing.xs,
    },
    timestamp: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'right',
        fontSize: 11,
    },
});

export default NotificationsScreen;
