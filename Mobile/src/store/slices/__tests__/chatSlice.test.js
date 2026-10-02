import reducer, {
  receiveMessage,
  sendMessageThunk,
  getConversationsThunk,
  getMessagesThunk,
  markAsReadThunk,
  getUnreadCountThunk,
} from '../chatSlice';

describe('chatSlice reducer and thunks', () => {
  const initialState = {
    conversations: [],
    messagesByConversation: {},
    unreadCount: 0,
    loadingConversations: false,
    loadingMessages: false,
    error: null,
  };

  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('receiveMessage', () => {
    it('should add incoming message to conversation thread and update preview and unreadCount', () => {
      const startState = {
        ...initialState,
        conversations: [{ id: 'conv-1', lastMessage: null, unreadCount: 0 }],
        messagesByConversation: { 'conv-1': [] },
      };

      const incoming = {
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Hello from SignalR!',
        createdAt: new Date().toISOString(),
      };

      const nextState = reducer(startState, receiveMessage(incoming));

      expect(nextState.messagesByConversation['conv-1']).toHaveLength(1);
      expect(nextState.messagesByConversation['conv-1'][0].id).toBe('msg-1');
      expect(nextState.conversations[0].lastMessagePreview).toBe('Hello from SignalR!');
      expect(nextState.conversations[0].unreadCount).toBe(1);
      expect(nextState.unreadCount).toBe(1);
    });

    it('should deduplicate messages with the same id to prevent duplicate entries', () => {
      const existingMsg = {
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Hello!',
      };
      const startState = {
        ...initialState,
        conversations: [{ id: 'conv-1', lastMessage: existingMsg, unreadCount: 1 }],
        messagesByConversation: { 'conv-1': [existingMsg] },
        unreadCount: 1,
      };

      const duplicateIncoming = { ...existingMsg };
      const nextState = reducer(startState, receiveMessage(duplicateIncoming));

      expect(nextState.messagesByConversation['conv-1']).toHaveLength(1);
      expect(nextState.unreadCount).toBe(1);
    });
  });

  describe('sendMessageThunk lifecycle (Optimistic UI)', () => {
    it('should optimistically insert temp message on pending', () => {
      const startState = {
        ...initialState,
        conversations: [{ id: 'conv-1', lastMessage: null }],
        messagesByConversation: { 'conv-1': [] },
      };

      const pendingAction = {
        type: sendMessageThunk.pending.type,
        meta: {
          arg: {
            conversationId: 'conv-1',
            content: 'Optimistic hello',
            tempId: 'temp-123',
            user: { id: 'u-1', firstName: 'John' },
          },
        },
      };

      const state = reducer(startState, pendingAction);

      expect(state.messagesByConversation['conv-1']).toHaveLength(1);
      expect(state.messagesByConversation['conv-1'][0].id).toBe('temp-123');
      expect(state.messagesByConversation['conv-1'][0].isTemp).toBe(true);
      expect(state.conversations[0].lastMessagePreview).toBe('Optimistic hello');
    });

    it('should replace temp message with server confirmed message on fulfilled', () => {
      const tempMsg = {
        id: 'temp-123',
        tempId: 'temp-123',
        conversationId: 'conv-1',
        content: 'Optimistic hello',
        isTemp: true,
      };
      const startState = {
        ...initialState,
        conversations: [{ id: 'conv-1', lastMessage: tempMsg }],
        messagesByConversation: { 'conv-1': [tempMsg] },
      };

      const serverMsg = {
        id: 'server-456',
        conversationId: 'conv-1',
        content: 'Optimistic hello',
        createdAt: new Date().toISOString(),
      };

      const fulfilledAction = {
        type: sendMessageThunk.fulfilled.type,
        payload: {
          message: serverMsg,
          tempId: 'temp-123',
          conversationId: 'conv-1',
        },
      };

      const state = reducer(startState, fulfilledAction);

      expect(state.messagesByConversation['conv-1']).toHaveLength(1);
      expect(state.messagesByConversation['conv-1'][0].id).toBe('server-456');
      expect(state.messagesByConversation['conv-1'][0].isTemp).toBeUndefined();
      expect(state.conversations[0].lastMessage.id).toBe('server-456');
    });

    it('should remove temp message on rejected', () => {
      const tempMsg = {
        id: 'temp-123',
        conversationId: 'conv-1',
        content: 'Failed hello',
      };
      const startState = {
        ...initialState,
        messagesByConversation: { 'conv-1': [tempMsg] },
      };

      const rejectedAction = {
        type: sendMessageThunk.rejected.type,
        payload: 'Network Error',
        meta: {
          arg: {
            conversationId: 'conv-1',
            tempId: 'temp-123',
          },
        },
      };

      const state = reducer(startState, rejectedAction);

      expect(state.messagesByConversation['conv-1']).toHaveLength(0);
      expect(state.error).toBe('Network Error');
    });
  });

  describe('getConversationsThunk and markAsReadThunk', () => {
    it('should populate conversations from array payload or wrapped object', () => {
      const actionWrapped = {
        type: getConversationsThunk.fulfilled.type,
        payload: { conversations: [{ id: 'c1' }, { id: 'c2' }] },
      };
      const state1 = reducer(initialState, actionWrapped);
      expect(state1.conversations).toHaveLength(2);

      const actionDirect = {
        type: getConversationsThunk.fulfilled.type,
        payload: [{ id: 'c3' }],
      };
      const state2 = reducer(initialState, actionDirect);
      expect(state2.conversations).toHaveLength(1);
    });

    it('should reset conversation unreadCount and decrement global unreadCount on markAsReadThunk fulfilled', () => {
      const startState = {
        ...initialState,
        conversations: [{ id: 'conv-1', unreadCount: 3 }, { id: 'conv-2', unreadCount: 2 }],
        unreadCount: 5,
      };

      const action = {
        type: markAsReadThunk.fulfilled.type,
        payload: 'conv-1',
      };

      const state = reducer(startState, action);
      expect(state.conversations.find((c) => c.id === 'conv-1').unreadCount).toBe(0);
      expect(state.unreadCount).toBe(2);
    });
  });
});
