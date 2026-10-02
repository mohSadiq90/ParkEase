import chatHub from '../chatHub';
import * as signalR from '@microsoft/signalr';
import { storageService } from '../../storage/secureStorage';
import store from '../../../store';
import { receiveMessage } from '../../../store/slices/chatSlice';

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../../storage/secureStorage', () => ({
  storageService: {
    getAccessToken: jest.fn(),
  },
}));

describe('chatHub SignalR Client', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await chatHub.disconnect();
  });

  it('should skip connection if access token is not available', async () => {
    storageService.getAccessToken.mockResolvedValue(null);

    await chatHub.connect();

    expect(chatHub.isConnected).toBe(false);
    expect(chatHub.connection).toBeNull();
  });

  it('should build connection and start SignalR hub when access token is present', async () => {
    storageService.getAccessToken.mockResolvedValue('mock-access-token');

    await chatHub.connect();

    expect(chatHub.isConnected).toBe(true);
    expect(chatHub.connection).not.toBeNull();
    expect(chatHub.connection.start).toHaveBeenCalled();
    expect(chatHub.connection.on).toHaveBeenCalledWith('ReceiveMessage', expect.any(Function));
  });

  it('should dispatch receiveMessage to Redux store and notify listeners on ReceiveMessage event', async () => {
    storageService.getAccessToken.mockResolvedValue('mock-access-token');

    await chatHub.connect();

    // Extract the ReceiveMessage callback registered on the mock connection
    const onCalls = chatHub.connection.on.mock.calls;
    const receiveMessageCall = onCalls.find(([eventName]) => eventName === 'ReceiveMessage');
    expect(receiveMessageCall).toBeDefined();

    const callback = receiveMessageCall[1];
    const mockMessage = { id: 'm-1', conversationId: 'c-1', content: 'Live websocket message' };

    const mockListener = jest.fn();
    const unsubscribe = chatHub.addListener(mockListener);

    // Trigger the callback
    callback(mockMessage);

    expect(store.dispatch).toHaveBeenCalledWith(receiveMessage(mockMessage));
    expect(mockListener).toHaveBeenCalledWith(mockMessage);

    // Test unsubscribe
    unsubscribe();
    callback(mockMessage);
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  it('should invoke JoinConversation and LeaveConversation on connection', async () => {
    storageService.getAccessToken.mockResolvedValue('mock-access-token');

    await chatHub.connect();

    await chatHub.joinConversation('conv-101');
    expect(chatHub.activeConversationId).toBe('conv-101');
    expect(chatHub.connection.invoke).toHaveBeenCalledWith('JoinConversation', 'conv-101');

    await chatHub.leaveConversation('conv-101');
    expect(chatHub.activeConversationId).toBeNull();
    expect(chatHub.connection.invoke).toHaveBeenCalledWith('LeaveConversation', 'conv-101');
  });

  it('should gracefully stop connection on disconnect', async () => {
    storageService.getAccessToken.mockResolvedValue('mock-access-token');

    await chatHub.connect();
    expect(chatHub.isConnected).toBe(true);

    await chatHub.disconnect();
    expect(chatHub.isConnected).toBe(false);
    expect(chatHub.connection).toBeNull();
  });
});
