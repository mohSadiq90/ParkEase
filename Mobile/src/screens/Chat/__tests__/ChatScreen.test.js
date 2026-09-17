import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import ChatScreen from '../ChatScreen';
import chatService from '../../../services/chat/chatService';

jest.mock('../../../services/chat/chatService', () => ({
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

describe('ChatScreen', () => {
  const mockNavigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat thread and allows sending a message', async () => {
    chatService.getMessages.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'msg-1',
          senderId: 'user-2',
          senderName: 'Host John',
          content: 'Hello, your spot is ready!',
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
        senderId: 'user-1',
        senderName: 'Me',
        content: 'Thanks, on my way!',
        createdAt: new Date().toISOString(),
        conversationId: 'conv-100',
        isRead: false,
      },
    });

    const route = {
      params: {
        conversationId: 'conv-100',
        parkingSpaceId: 'spot-555',
        participantName: 'Host John',
        parkingTitle: 'Downtown Lot 4',
      },
    };

    const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
      <ChatScreen navigation={mockNavigation} route={route} />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-1', firstName: 'Driver' },
          },
        },
      }
    );

    // Header info
    expect(getByText('Host John')).toBeTruthy();
    expect(getByText('🅿️ Downtown Lot 4')).toBeTruthy();

    await waitFor(() => {
      expect(chatService.getMessages).toHaveBeenCalledWith('conv-100');
      expect(chatService.markAsRead).toHaveBeenCalledWith('conv-100');
      expect(getByText('Hello, your spot is ready!')).toBeTruthy();
    });

    // Send a message
    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Thanks, on my way!');
    fireEvent.press(getByTestId('chat-send-btn'));

    await waitFor(() => {
      expect(chatService.sendMessage).toHaveBeenCalledWith('spot-555', 'Thanks, on my way!', 'conv-100');
    });
  });

  it('handles null conversationId without crashing when starting new chat', async () => {
    const route = {
      params: {
        conversationId: null,
        parkingSpaceId: 'spot-999',
        participantName: 'Space Owner',
        parkingTitle: 'Airport Deck A',
      },
    };

    const { getByText } = renderWithProviders(
      <ChatScreen navigation={mockNavigation} route={route} />
    );

    expect(getByText('Space Owner')).toBeTruthy();
    expect(getByText('Start the conversation!')).toBeTruthy();
    expect(chatService.getMessages).not.toHaveBeenCalled();
  });

  it('hides bottom tab bar on mount and restores it on unmount', () => {
    const mockSetOptions = jest.fn();
    const mockParentNav = {
      getState: () => ({ type: 'tab' }),
      setOptions: mockSetOptions,
    };
    const navWithParent = {
      ...mockNavigation,
      getParent: jest.fn(() => mockParentNav),
    };

    const route = {
      params: { conversationId: null, parkingSpaceId: 'spot-1' },
    };

    const { unmount } = renderWithProviders(
      <ChatScreen navigation={navWithParent} route={route} />
    );

    expect(mockSetOptions).toHaveBeenCalledWith({ tabBarStyle: { display: 'none' } });

    unmount();
    expect(mockSetOptions).toHaveBeenCalledWith({ tabBarStyle: undefined });
  });

  it('configures KeyboardAvoidingView to prevent obscuring the textfield', () => {
    const route = {
      params: { conversationId: null, parkingSpaceId: 'spot-1' },
    };

    const { UNSAFE_getByType } = renderWithProviders(
      <ChatScreen navigation={mockNavigation} route={route} />
    );

    const { KeyboardAvoidingView } = require('react-native');
    const kav = UNSAFE_getByType(KeyboardAvoidingView);
    expect(kav.props.keyboardVerticalOffset).toBe(0);
    // On test environment (often iOS or android depending on jest setup):
    expect(['padding', 'height']).toContain(kav.props.behavior);
  });
});
