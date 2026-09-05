import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../styles/globalStyles';
import Input from '../../components/Common/Input';
import Button from '../../components/Common/Button';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import { updateProfileThunk } from '../../store/slices/authSlice';
import authService from '../../services/auth/authService';
import googleAuthService from '../../services/auth/googleAuthService';
import { getExternalAuthErrorMessage } from '../../utils/externalAuthErrors';


const EditProfileScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { user, loading } = useSelector(state => state.auth);

    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
    const [linkingGoogle, setLinkingGoogle] = useState(false);

    const handleSave = async () => {
        if (!firstName || !lastName) {
            Alert.alert('Error', 'First name and last name are required');
            return;
        }

        try {
            const resultAction = await dispatch(updateProfileThunk({
                firstName,
                lastName,
                phoneNumber
            }));

            if (updateProfileThunk.fulfilled.match(resultAction)) {
                Alert.alert('Success', 'Profile updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', resultAction.payload || 'Failed to update profile');
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred');
        }
    };

    const handleLinkGoogle = async () => {
        try {
            setLinkingGoogle(true);
            const authResult = await googleAuthService.signIn();
            if (authResult?.cancelled || authResult?.inProgress) {
                return;
            }
            if (!authResult?.idToken) {
                throw new Error('No identity token received from Google');
            }

            const res = await authService.linkExternal({
                provider: 'google',
                idToken: authResult.idToken,
            });

            if (res?.success) {
                Alert.alert('Success', 'Your Google account has been linked successfully!');
            } else {
                Alert.alert('Link Failed', getExternalAuthErrorMessage(res));
            }
        } catch (error) {
            Alert.alert('Link Failed', getExternalAuthErrorMessage(error));
        } finally {
            setLinkingGoogle(false);
        }
    };


    return (
        <ScreenLayout style={styles.container} keyboardAvoiding={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 34 }} />
            </View>

            <KeyboardAvoidingView 
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
                <ScrollView 
                    contentContainerStyle={[styles.scrollContent, { flexGrow: 1, paddingBottom: 100 }]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {firstName?.charAt(0) || 'U'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="First Name"
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Enter first name"
                        />
                        <Input
                            label="Last Name"
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Enter last name"
                        />
                        <Input
                            label="Phone Number"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder="Enter phone number"
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Button
                        title="Save Changes"
                        onPress={handleSave}
                        loading={loading}
                        style={styles.submitButton}
                    />

                    <View style={styles.socialSection}>
                        <Text style={styles.sectionTitle}>Linked Accounts</Text>
                        <Text style={styles.socialSubtext}>Link your Google account for faster one-tap sign-in.</Text>
                        <TouchableOpacity
                            style={styles.linkGoogleButton}
                            onPress={handleLinkGoogle}
                            disabled={linkingGoogle}
                        >
                            <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
                            <Text style={styles.linkGoogleText}>
                                {linkingGoogle ? 'Connecting Google...' : 'Link Google Account'}
                            </Text>
                        </TouchableOpacity>
                    </View>
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
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    avatarText: {
        ...typography.h1,
        color: colors.primary,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.surface,
    },
    emailText: {
        ...typography.body2,
        color: colors.textSecondary,
    },
    submitButton: {
        marginTop: 20,
    },
    socialSection: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: 6,
    },
    socialSubtext: {
        ...typography.body2,
        color: colors.textSecondary,
        marginBottom: 16,
    },
    linkGoogleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    linkGoogleText: {
        ...typography.button,
        color: colors.text,
        marginLeft: 10,
    },
});

export default EditProfileScreen;

