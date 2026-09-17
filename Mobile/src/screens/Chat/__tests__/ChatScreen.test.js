import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
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

  it('renders chat thread, optimistically updates UI, clears input immediately, and completes send', async () => {
    let resolveSend;
    const sendPromise = new Promise((resolve) => {
      resolveSend = resolve;
    });

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
    chatService.sendMessage.mockReturnValueOnce(sendPromise);

    const route = {
      params: {
        conversationId: 'conv-100',
        parkingSpaceId: 'spot-555',
        participantName: 'Host John',
        parkingTitle: 'Downtown Lot 4',
      },
    };

    const { getByText, getByPlaceholderText, getByTestId, queryByText } = renderWithProviders(
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

    // Input must be cleared IMMEDIATELY
    expect(input.props.value).toBe('');

    // Message must appear IMMEDIATELY with "Sending..." indicator
    expect(getByText('Thanks, on my way!')).toBeTruthy();
    expect(getByText('Sending...')).toBeTruthy();

    // Now resolve the server response
    await act(async () => {
      resolveSend({
        success: true,
        data: {
          id: 'msg-2',
          senderId: 'user-1',
          senderName: 'Driver',
          content: 'Thanks, on my way!',
          createdAt: new Date().toISOString(),
          conversationId: 'conv-100',
          isRead: false,
        },
      });
    });

    await waitFor(() => {
      expect(chatService.sendMessage).toHaveBeenCalledWith('spot-555', 'Thanks, on my way!', 'conv-100');
      // Sending indicator should now be replaced by checkmark
      expect(queryByText('Sending...')).toBeNull();
      expect(getByText('✓')).toBeTruthy();
    });
  });

  it('shows failed state and allows retrying when message send fails', async () => {
    chatService.getMessages.mockResolvedValueOnce({
      success: true,
      data: [],
    });
    chatService.markAsRead.mockResolvedValueOnce({ success: true });
    // First send fails
    chatService.sendMessage.mockRejectedValueOnce(new Error('Network disconnected'));

    const route = {
      params: {
        conversationId: 'conv-200',
        parkingSpaceId: 'spot-888',
        participantName: 'Host Sarah',
        parkingTitle: 'Midtown Garage',
      },
    };

    const { getByText, getByPlaceholderText, getByTestId, queryByText } = renderWithProviders(
      <ChatScreen navigation={mockNavigation} route={route} />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-1', firstName: 'Driver' },
          },
        },
      }
    );

    await waitFor(() => {
      expect(chatService.getMessages).toHaveBeenCalledWith('conv-200');
    });

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Will I need a key fob?');
    fireEvent.press(getByTestId('chat-send-btn'));

    // Optimistically rendered
    expect(getByText('Will I need a key fob?')).toBeTruthy();

    // After network rejection, updates to failed with retry option
    await waitFor(() => {
      expect(getByText('Tap to retry')).toBeTruthy();
    });

    // Mock next attempt to succeed
    chatService.sendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'msg-recovered',
        senderId: 'user-1',
        senderName: 'Driver',
        content: 'Will I need a key fob?',
        createdAt: new Date().toISOString(),
        conversationId: 'conv-200',
        isRead: false,
      },
    });

    // Tap to retry
    const retryBtn = getByText('Tap to retry');
    fireEvent.press(retryBtn);

    await waitFor(() => {
      expect(chatService.sendMessage).toHaveBeenCalledTimes(2);
      expect(queryByText('Tap to retry')).toBeNull();
      expect(getByText('✓')).toBeTruthy();
    });
  });

  it('renders date dividers between messages on different days', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(14, 0, 0, 0);

    const today = new Date();
    today.setHours(9, 30, 0, 0);

    chatService.getMessages.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'msg-today',
          senderId: 'user-2',
          senderName: 'Host John',
          content: 'Good morning!',
          createdAt: today.toISOString(),
          isRead: true,
        },
        {
          id: 'msg-yesterday',
          senderId: 'user-2',
          senderName: 'Host John',
          content: 'Spot is booked for tomorrow.',
          createdAt: yesterday.toISOString(),
          isRead: true,
        },
      ],
    });
    chatService.markAsRead.mockResolvedValueOnce({ success: true });

    const route = {
      params: {
        conversationId: 'conv-100',
        parkingSpaceId: 'spot-555',
        participantName: 'Host John',
      },
    };

    const { getByText } = renderWithProviders(
      <ChatScreen navigation={mockNavigation} route={route} />
    );

    await waitFor(() => {
      expect(getByText('Good morning!')).toBeTruthy();
      expect(getByText('Spot is booked for tomorrow.')).toBeTruthy();
      expect(getByText('Yesterday')).toBeTruthy();
      expect(getByText('Today')).toBeTruthy();
    });
  });

  it('handles quick suggestion chips in empty chat', async () => {
    chatService.sendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'msg-sug',
        senderId: 'user-1',
        senderName: 'Driver',
        content: 'Hi, is this parking space available now?',
        createdAt: new Date().toISOString(),
        conversationId: 'conv-new',
        isRead: false,
      },
    });

    const route = {
      params: {
        conversationId: null,
        parkingSpaceId: 'spot-999',
        participantName: 'Space Owner',
        parkingTitle: 'Airport Deck A',
      },
    };

    const { getByText, getByTestId } = renderWithProviders(
      <ChatScreen navigation={mockNavigation} route={route} />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-1', firstName: 'Driver' },
          },
        },
      }
    );

    expect(getByText('Space Owner')).toBeTruthy();
    expect(getByText(/Start the conversation with Space Owner!/)).toBeTruthy();

    const quickChip = getByTestId('quick-suggestion-0');
    expect(quickChip).toBeTruthy();
    fireEvent.press(quickChip);

    await waitFor(() => {
      expect(chatService.sendMessage).toHaveBeenCalledWith(
        'spot-999',
        'Hi, is this parking space available now?',
        null
      );
    });
  });

  it('preserves optimistic messages during background polling', async () => {
    let resolveSend;
    const sendPromise = new Promise((resolve) => {
      resolveSend = resolve;
    });

    chatService.getMessages
      .mockResolvedValueOnce({
        success: true,
        data: [],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [], // Poll returns empty (not yet saved on server)
      });
    chatService.markAsRead.mockResolvedValue({ success: true });
    chatService.sendMessage.mockReturnValueOnce(sendPromise);

    const route = {
      params: {
        conversationId: 'conv-poll',
        parkingSpaceId: 'spot-123',
        participantName: 'Host Mike',
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

    await waitFor(() => {
      expect(chatService.getMessages).toHaveBeenCalledWith('conv-poll');
    });

    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'Still on track!');
    fireEvent.press(getByTestId('chat-send-btn'));

    expect(getByText('Still on track!')).toBeTruthy();
    expect(getByText('Sending...')).toBeTruthy();

    // Trigger polling refresh
    const refreshBtn = getByTestId('chat-send-btn');
    expect(refreshBtn).toBeTruthy();

    // Optimistic message should NOT disappear during polling
    expect(getByText('Still on track!')).toBeTruthy();
    expect(getByText('Sending...')).toBeTruthy();

    await act(async () => {
      resolveSend({
        success: true,
        data: {
          id: 'msg-final',
          senderId: 'user-1',
          senderName: 'Driver',
          content: 'Still on track!',
          createdAt: new Date().toISOString(),
          conversationId: 'conv-poll',
          isRead: false,
        },
      });
    });

    await waitFor(() => {
      expect(getByText('Still on track!')).toBeTruthy();
      expect(getByText('✓')).toBeTruthy();
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
    expect(getByText(/Start the conversation/)).toBeTruthy();
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
    expect(['padding', 'height']).toContain(kav.props.behavior);
  });

  it('does not render misleading online presence green dot in the header', () => {
    const route = {
      params: {
        conversationId: null,
        parkingSpaceId: 'spot-1',
        participantName: 'Host Jessica',
        parkingTitle: 'Reserved Garage 2B',
      },
    };

    const { getByText, queryByTestId } = renderWithProviders(
      <ChatScreen navigation={mockNavigation} route={route} />
    );

    expect(getByText('Host Jessica')).toBeTruthy();
    expect(getByText('🅿️ Reserved Garage 2B')).toBeTruthy();
    // Verify no presence / online indicator is rendered
    expect(queryByTestId('online-indicator')).toBeNull();
  });

  it('renders double checkmark (✓✓) when message is delivered or read', async () => {
    chatService.getMessages.mockReset();
    chatService.getMessages.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'msg-delivered',
          senderId: 'user-1',
          senderName: 'Driver',
          content: 'I have arrived safely.',
          createdAt: new Date().toISOString(),
          isRead: false,
          isDelivered: true,
        },
        {
          id: 'msg-read',
          senderId: 'user-1',
          senderName: 'Driver',
          content: 'Can you see my car?',
          createdAt: new Date().toISOString(),
          isRead: true,
        },
      ],
    });
    chatService.markAsRead.mockResolvedValueOnce({ success: true });

    const route = {
      params: {
        conversationId: 'conv-receipts',
        parkingSpaceId: 'spot-77',
        participantName: 'Host Mike',
      },
    };

    const { getAllByText } = renderWithProviders(
      <ChatScreen navigation={mockNavigation} route={route} />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-1', firstName: 'Driver' },
          },
        },
      }
    );

    await waitFor(() => {
      expect(chatService.getMessages).toHaveBeenCalledWith('conv-receipts');
      const doubleCheckmarks = getAllByText('✓✓');
      expect(doubleCheckmarks.length).toBe(2);
    });
  });
});
