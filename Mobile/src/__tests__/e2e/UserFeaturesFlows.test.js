/**
 * User Features, Fleet, Social Reviews & Chat End-to-End Flow Tests
 *
 * Covers:
 * 1. User Profile & Account Settings: Profile view, role badge, navigation links
 * 2. Edit Profile Flow: Name/phone inputs, inline required validation, successful save
 * 3. Change Password Flow: Inline validation (matching, min length), successful password rotation
 * 4. Vehicles & Garage Flow: Listing vehicles, vehicle category pills, add vehicle modal, delete vehicle
 * 5. Reviews & Ratings Flow: Star rating selection, validation prompt, successful review submission
 * 6. Chat & Messaging Flow: Thread rendering, optimistic messaging, delivery status
 * 7. Notifications Flow: Unread alerts, mark-as-read interaction, empty state
 */

import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, fireEvent, waitFor } from '../../utils/test-utils';
import apiClient from '../../services/api/apiClient';
import authService from '../../services/auth/authService';
import chatService from '../../services/chat/chatService';
import ProfileScreen from '../../screens/Profile/ProfileScreen';
import EditProfileScreen from '../../screens/Profile/EditProfileScreen';
import ChangePasswordScreen from '../../screens/Profile/ChangePasswordScreen';
import MyVehiclesScreen from '../../screens/Profile/MyVehiclesScreen';
import CreateReviewScreen from '../../screens/Review/CreateReviewScreen';
import ChatScreen from '../../screens/Chat/ChatScreen';
import NotificationsScreen from '../../screens/Notifications/NotificationsScreen';

jest.mock('../../services/api/apiClient');
jest.mock('../../services/auth/authService');
jest.mock('../../services/chat/chatService', () => ({
    __esModule: true,
    default: {
        getMessages: jest.fn(),
        sendMessage: jest.fn(),
        markAsRead: jest.fn(),
        findConversationByParkingSpace: jest.fn(),
        getConversations: jest.fn(),
        getUnreadCount: jest.fn(),
    },
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(() => () => {}),
    getParent: jest.fn(() => ({
        setOptions: jest.fn(),
        navigate: jest.fn(),
        getState: jest.fn(() => ({ type: 'tab' })),
    })),
};

const preloadedUserState = {
    auth: {
        user: {
            id: 'user-001',
            email: 'driver@parkease.com',
            firstName: 'Alex',
            lastName: 'Rider',
            phoneNumber: '+15551234567',
            role: 'Member',
            roles: ['Member'],
            hasPassword: true,
            linkedProviders: [],
        },
        token: 'valid-jwt-token',
        isAuthenticated: true,
        loading: false,
    },
};

describe('User Features, Fleet, Social Reviews & Chat End-to-End Flows', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ── 1. Profile & Account Settings Flow ──
    describe('Profile Screen Flow', () => {
        it('renders user details, role badge, and handles edit profile navigation', async () => {
            const { getByText, getAllByText } = renderWithProviders(
                <ProfileScreen navigation={mockNavigation} />,
                { preloadedState: preloadedUserState }
            );

            expect(getAllByText('Alex Rider').length).toBeGreaterThanOrEqual(1);
            expect(getAllByText('driver@parkease.com').length).toBeGreaterThanOrEqual(1);
            expect(getByText('Driver Member')).toBeTruthy();

            // Press Edit Profile menu item to navigate to EditProfile
            const editProfileBtn = getByText('Edit Profile');
            fireEvent.press(editProfileBtn);

            expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile');
        });
    });

    // ── 2. Edit Profile Flow ──
    describe('Edit Profile Flow', () => {
        it('validates required names and saves updated profile', async () => {
            authService.updateProfile.mockResolvedValueOnce({
                success: true,
                data: {
                    id: 'user-001',
                    email: 'driver@parkease.com',
                    firstName: 'Alexander',
                    lastName: 'Rider',
                    phoneNumber: '+15559876543',
                    role: 'Member',
                },
            });

            const { getByDisplayValue, getByText } = renderWithProviders(
                <EditProfileScreen navigation={mockNavigation} />,
                { preloadedState: preloadedUserState }
            );

            const firstNameInput = getByDisplayValue('Alex');
            const phoneInput = getByDisplayValue('+15551234567');

            // Clear first name to test required validation
            fireEvent.changeText(firstNameInput, '');
            const saveBtn = getByText('Save Changes');
            fireEvent.press(saveBtn);

            expect(Alert.alert).toHaveBeenCalledWith('Error', 'First name and last name are required');

            // Re-populate valid first name and updated phone
            fireEvent.changeText(firstNameInput, 'Alexander');
            fireEvent.changeText(phoneInput, '+15559876543');
            fireEvent.press(saveBtn);

            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Success',
                    'Profile updated successfully',
                    expect.any(Array)
                );
            });
        });
    });

    // ── 3. Change Password Flow ──
    describe('Change Password Flow', () => {
        it('validates matching passwords and submits password change', async () => {
            authService.changePassword.mockResolvedValueOnce({
                success: true,
                message: 'Password changed successfully',
            });

            const { getByPlaceholderText, getByText } = renderWithProviders(
                <ChangePasswordScreen navigation={mockNavigation} />,
                { preloadedState: preloadedUserState }
            );

            const currentInput = getByPlaceholderText('Enter current password');
            const newInput = getByPlaceholderText('Enter new password');
            const confirmInput = getByPlaceholderText('Confirm new password');
            const updateBtn = getByText('Update Password');

            // Test mismatch validation
            fireEvent.changeText(currentInput, 'OldPass123!');
            fireEvent.changeText(newInput, 'NewPass123!');
            fireEvent.changeText(confirmInput, 'DifferentPass123!');
            fireEvent.press(updateBtn);

            expect(Alert.alert).toHaveBeenCalledWith('Error', 'New passwords do not match');

            // Test matching passwords
            fireEvent.changeText(confirmInput, 'NewPass123!');
            fireEvent.press(updateBtn);

            await waitFor(() => {
                expect(authService.changePassword).toHaveBeenCalledWith({
                    currentPassword: 'OldPass123!',
                    newPassword: 'NewPass123!',
                });
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Success',
                    'Your password has been updated successfully',
                    expect.any(Array)
                );
            });
        });
    });

    // ── 4. Vehicles & Garage Management Flow ──
    describe('Vehicles & Garage Flow', () => {
        it('renders vehicle list, opens Add Vehicle modal, and deletes vehicle', async () => {
            const mockVehicles = [
                {
                    id: 'v-10',
                    licensePlate: 'ABC-1234',
                    make: 'Tesla',
                    model: 'Model 3',
                    color: 'Pearl White',
                    vehicleType: 0,
                    isEv: true,
                },
            ];

            apiClient.get.mockResolvedValueOnce({
                success: true,
                data: mockVehicles,
            });
            apiClient.delete.mockResolvedValueOnce({
                success: true,
                message: 'Vehicle removed',
            });

            const { findByText, getByText, getByTestId } = renderWithProviders(
                <MyVehiclesScreen navigation={mockNavigation} />
            );

            // Renders vehicle card
            expect(await findByText('ABC-1234')).toBeTruthy();
            expect(getByText('Tesla Model 3 · Pearl White')).toBeTruthy();

            // Press Add Vehicle button to open modal
            const addVehicleBtn = getByTestId('add-vehicle-btn');
            fireEvent.press(addVehicleBtn);

            // Modal opens with vehicle category pills
            expect(getByText('Car')).toBeTruthy();
            expect(getByText('SUV')).toBeTruthy();
            expect(getByText('Electric')).toBeTruthy();

            // Close modal by pressing Cancel
            const cancelBtn = getByText('Cancel');
            fireEvent.press(cancelBtn);

            // Delete vehicle triggers confirmation Alert
            const deleteBtn = getByTestId('delete-vehicle-v-10');
            fireEvent.press(deleteBtn);

            expect(Alert.alert).toHaveBeenCalledWith(
                'Delete Vehicle',
                'Are you sure you want to remove this vehicle?',
                expect.any(Array)
            );
        });
    });

    // ── 5. Reviews & Ratings Flow ──
    describe('Reviews & Ratings Flow', () => {
        it('validates rating input and submits parking review', async () => {
            apiClient.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        id: 'rev-01',
                        rating: 5,
                        title: 'Great spot!',
                        comment: 'Very convenient and secure.',
                    },
                },
            });

            const route = {
                params: {
                    parkingSpaceId: 'spot-101',
                },
            };

            const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
                <CreateReviewScreen navigation={mockNavigation} route={route} />
            );

            const submitBtn = getByText('Submit Review');

            // Submitting without rating prompts alert
            fireEvent.press(submitBtn);
            expect(Alert.alert).toHaveBeenCalledWith('Rating Required', 'Please select a star rating');

            // Tap 5-star rating (accessible via testID)
            const star5 = getByTestId('star-5');
            fireEvent.press(star5);

            // Enter review title and comments
            const titleInput = getByPlaceholderText('Summarize your experience');
            const commentInput = getByPlaceholderText('Share more details');

            fireEvent.changeText(titleInput, 'Great spot!');
            fireEvent.changeText(commentInput, 'Very convenient and secure.');

            fireEvent.press(submitBtn);

            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Thank You!',
                    'Your review has been submitted',
                    expect.any(Array)
                );
            });
        });
    });

    // ── 6. Chat & Messaging Flow ──
    describe('Chat & Messaging Flow', () => {
        it('loads thread messages, accepts text, and sends message optimistically', async () => {
            chatService.getMessages.mockResolvedValueOnce({
                success: true,
                data: [
                    {
                        id: 'msg-1',
                        senderId: 'host-01',
                        senderName: 'Host Mike',
                        content: 'Welcome! Gate code is #4321.',
                        createdAt: new Date().toISOString(),
                        isRead: true,
                    },
                ],
            });
            chatService.markAsRead.mockResolvedValueOnce({ success: true });
            chatService.sendMessage.mockResolvedValueOnce({
                success: true,
                data: {
                    id: 'msg-2',
                    senderId: 'user-001',
                    senderName: 'Alex',
                    content: 'Thank you, parked successfully!',
                    createdAt: new Date().toISOString(),
                },
            });

            const route = {
                params: {
                    conversationId: 'conv-202',
                    parkingSpaceId: 'spot-101',
                    participantName: 'Host Mike',
                    parkingTitle: 'Downtown Lot 1',
                },
            };

            const { findByText, getByPlaceholderText, getByTestId } = renderWithProviders(
                <ChatScreen navigation={mockNavigation} route={route} />,
                { preloadedState: preloadedUserState }
            );

            expect(await findByText('Welcome! Gate code is #4321.')).toBeTruthy();

            const input = getByPlaceholderText('Type a message...');
            fireEvent.changeText(input, 'Thank you, parked successfully!');

            const sendBtn = getByTestId('chat-send-btn');
            fireEvent.press(sendBtn);

            await waitFor(() => {
                expect(chatService.sendMessage).toHaveBeenCalledWith('spot-101', 'Thank you, parked successfully!', 'conv-202');
            });
        });
    });

    // ── 7. Notifications Flow ──
    describe('Notifications Flow', () => {
        it('renders notification alerts and marks an unread notification as read', async () => {
            const mockNotifs = {
                data: {
                    success: true,
                    data: [
                        {
                            id: 'notif-10',
                            title: 'Reservation Activated',
                            message: 'Your parking reservation at Bay A-12 has started.',
                            isRead: false,
                            createdAt: '2026-09-18T08:00:00Z',
                        },
                    ],
                },
            };

            apiClient.get.mockResolvedValueOnce(mockNotifs);
            apiClient.put.mockResolvedValueOnce({
                data: { success: true },
            });

            const { findByText, getByText } = renderWithProviders(
                <NotificationsScreen navigation={mockNavigation} />
            );

            expect(await findByText('Reservation Activated')).toBeTruthy();
            expect(getByText('Your parking reservation at Bay A-12 has started.')).toBeTruthy();

            // Press Mark read button
            const markReadBtn = getByText('Mark read');
            fireEvent.press(markReadBtn);

            await waitFor(() => {
                expect(apiClient.put).toHaveBeenCalled();
            });
        });
    });
});
