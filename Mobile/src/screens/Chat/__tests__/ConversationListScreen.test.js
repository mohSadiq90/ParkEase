import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import ConversationListScreen from '../ConversationListScreen';
import chatService from '../../../services/chat/chatService';

jest.mock('../../../services/chat/chatService', () => ({
  __esModule: true,
  default: {
    getConversations: jest.fn(),
    getLastMessageReceipt: jest.fn(),
    getAllReceipts: jest.fn(() => ({})),
    resolveLatestReceipts: jest.fn(() => Promise.resolve({})),
  },
}));

describe('ConversationListScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders conversation list with previews, unread count, and navigates to ChatScreen', async () => {
    const mockConversations = [
      {
        id: 'conv-101',
        parkingSpaceId: 'space-901',
        parkingSpaceTitle: 'Downtown Reserved Garage',
        otherParticipantName: 'Sarah Connor',
        lastMessagePreview: 'Spot is available right now!',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 2,
      },
    ];

    chatService.getConversations.mockResolvedValueOnce({
      success: true,
      data: {
        conversations: mockConversations,
      },
    });

    const { getByText, getByTestId, queryByTestId } = renderWithProviders(
      <ConversationListScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(chatService.getConversations).toHaveBeenCalled();
      expect(getByText('Sarah Connor')).toBeTruthy();
      expect(getByText('🅿️ Downtown Reserved Garage')).toBeTruthy();
      expect(getByText('Spot is available right now!')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      // Incoming unread message should NOT display any receipt checkmark
      expect(queryByTestId('conversation-receipt-conv-101')).toBeNull();
    });

    const item = getByTestId('conversation-item-conv-101');
    fireEvent.press(item);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ChatScreen', {
      conversationId: 'conv-101',
      parkingSpaceId: 'space-901',
      participantName: 'Sarah Connor',
      parkingTitle: 'Downtown Reserved Garage',
    });
  });

  it('renders double checkmark (✓✓) when the last message sent by user is delivered or read', async () => {
    const mockConversations = [
      {
        id: 'conv-mine-delivered',
        parkingSpaceId: 'space-102',
        parkingSpaceTitle: 'City Center Lot 5',
        otherParticipantName: 'John Host',
        lastMessagePreview: 'I have parked in bay 12.',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        isLastMessageMine: true,
        isDelivered: true,
      },
      {
        id: 'conv-mine-read',
        parkingSpaceId: 'space-103',
        parkingSpaceTitle: 'Airport Garage',
        otherParticipantName: 'Alex Host',
        lastMessagePreview: 'Thanks for the key code!',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        isLastMessageMine: true,
        isRead: true,
      },
    ];

    chatService.getConversations.mockResolvedValueOnce({
      success: true,
      data: {
        conversations: mockConversations,
      },
    });

    const { getByTestId, getAllByText } = renderWithProviders(
      <ConversationListScreen navigation={mockNavigation} />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-me' },
          },
        },
      }
    );

    await waitFor(() => {
      expect(getByTestId('conversation-receipt-conv-mine-delivered')).toBeTruthy();
      expect(getByTestId('conversation-receipt-conv-mine-read')).toBeTruthy();
      const doubleChecks = getAllByText('✓✓');
      expect(doubleChecks.length).toBe(2);
    });
  });

  it('renders single checkmark (✓) when the last message sent by user is sent but not yet delivered', async () => {
    const mockConversations = [
      {
        id: 'conv-mine-sent',
        parkingSpaceId: 'space-104',
        parkingSpaceTitle: 'Central Plaza',
        otherParticipantName: 'Elena Host',
        lastMessagePreview: 'Can I extend my stay?',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        isLastMessageMine: true,
        isDelivered: false,
        isRead: false,
      },
    ];

    chatService.getConversations.mockResolvedValueOnce({
      success: true,
      data: {
        conversations: mockConversations,
      },
    });

    const { getByTestId, getByText } = renderWithProviders(
      <ConversationListScreen navigation={mockNavigation} />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-me' },
          },
        },
      }
    );

    await waitFor(() => {
      expect(getByTestId('conversation-receipt-conv-mine-sent')).toBeTruthy();
      expect(getByText('✓')).toBeTruthy();
    });
  });

  it('displays receipt from chatService cached receipt store', async () => {
    const mockConversations = [
      {
        id: 'conv-cached',
        parkingSpaceId: 'space-105',
        parkingSpaceTitle: 'North Garage',
        otherParticipantName: 'Dave Host',
        lastMessagePreview: 'See you in 10 minutes',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
      },
    ];

    chatService.getConversations.mockResolvedValueOnce({
      success: true,
      data: {
        conversations: mockConversations,
      },
    });
    chatService.getLastMessageReceipt.mockReturnValue({
      senderId: 'user-me',
      isMine: true,
      isDelivered: true,
      isRead: true,
    });

    const { getByTestId, getByText } = renderWithProviders(
      <ConversationListScreen navigation={mockNavigation} />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-me' },
          },
        },
      }
    );

    await waitFor(() => {
      expect(getByTestId('conversation-receipt-conv-cached')).toBeTruthy();
      expect(getByText('✓✓')).toBeTruthy();
    });
  });

  it('renders empty state when there are no conversations', async () => {
    chatService.getConversations.mockResolvedValueOnce({
      success: true,
      data: {
        conversations: [],
      },
    });

    const { getByText } = renderWithProviders(
      <ConversationListScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('No conversations yet')).toBeTruthy();
      expect(getByText('Start chatting from a parking listing')).toBeTruthy();
    });
  });
});
