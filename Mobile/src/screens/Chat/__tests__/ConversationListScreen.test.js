import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import ConversationListScreen from '../ConversationListScreen';
import chatService from '../../../services/chat/chatService';

jest.mock('../../../services/chat/chatService', () => ({
  __esModule: true,
  default: {
    getConversations: jest.fn(),
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

    const { getByText, getByTestId } = renderWithProviders(
      <ConversationListScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(chatService.getConversations).toHaveBeenCalled();
      expect(getByText('Sarah Connor')).toBeTruthy();
      expect(getByText('🅿️ Downtown Reserved Garage')).toBeTruthy();
      expect(getByText('Spot is available right now!')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
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
