import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../styles/globalStyles';
import Input from '../../components/Common/Input';
import Button from '../../components/Common/Button';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import authService from '../../services/auth/authService';

const ChangePasswordScreen = ({ navigation }) => {
    const { user } = useSelector(state => state.auth);
    const isSocialOnly = user?.hasPassword === false;
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!isSocialOnly && !currentPassword) {
            Alert.alert('Error', 'Please enter your current password');
            return;
        }

        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Error', 'New password must be at least 8 characters long');
            return;
        }

        try {
            setLoading(true);
            if (isSocialOnly) {
                const response = await authService.setPassword({ newPassword });
                if (response.success) {
                    Alert.alert('Success', 'Your password has been set successfully', [
                        { text: 'OK', onPress: () => navigation.goBack() }
                    ]);
                } else {
                    Alert.alert('Error', response.message || 'Failed to set password');
                }
            } else {
                const response = await authService.changePassword({
                    currentPassword,
                    newPassword,
                });

                if (response.success) {
                    Alert.alert('Success', 'Your password has been updated successfully', [
                        { text: 'OK', onPress: () => navigation.goBack() }
                    ]);
                } else {
                    Alert.alert('Error', response.message || 'Failed to update password');
                }
            }
        } catch (error) {
            const code = error.response?.data?.code;
            if (code === 'password_not_set') {
                Alert.alert(
                    'No Password Set',
                    'Your account was created with Google and has no password set yet. Would you like to set this as your password?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Set Password',
                            onPress: async () => {
                                try {
                                    setLoading(true);
                                    const setRes = await authService.setPassword({ newPassword });
                                    if (setRes.success) {
                                        Alert.alert('Success', 'Your password has been set successfully', [
                                            { text: 'OK', onPress: () => navigation.goBack() }
                                        ]);
                                    } else {
                                        Alert.alert('Error', setRes.message || 'Failed to set password');
                                    }
                                } catch (e) {
                                    Alert.alert('Error', e.response?.data?.message || 'Failed to set password');
                                } finally {
                                    setLoading(false);
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenLayout style={styles.container} keyboardAvoiding={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isSocialOnly ? 'Set Password' : 'Change Password'}</Text>
                <View style={{ width: 34 }} />
            </View>

            <KeyboardAvoidingView 
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <ScrollView 
                    contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 120 }]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.description}>
                        {isSocialOnly 
                            ? 'Set a secure password for your account to enable standard email and password login.' 
                            : 'Your password must be at least 8 characters and should include a combination of numbers, letters, and special characters.'}
                    </Text>

                    {!isSocialOnly && (
                        <Input
                            label="Current Password"
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                        />
                    )}

                    <Input
                        label="New Password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                    />

                    <Input
                        label="Confirm New Password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />

                    <Button
                        title={isSocialOnly ? 'Set Password' : 'Update Password'}
                        onPress={handleSave}
                        loading={loading}
                        style={styles.submitButton}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.text,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    description: {
        ...typography.body2,
        color: colors.textSecondary,
        marginBottom: 25,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: 20,
    },
    submitButton: {
        marginTop: 30,
    },
});

export default ChangePasswordScreen;
