/**
 * SignalR Chat Hub Client
 * Handles real-time WebSocket connections, sending/receiving messages,
 * conversation channel joining, and Redux/listener notifications.
 */

import * as signalR from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';
import environment from '../../config/environment';
import { storageService } from '../storage/secureStorage';
import { receiveMessage } from '../../store/slices/chatSlice';
import store from '../../store';

const TAG = 'ChatHub';

class ChatHub {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.activeConversationId = null;
        this.listeners = new Set();
    }

    /**
     * Connect to the SignalR chat hub
     */
    async connect() {
        if (this.connection || this.isConnecting) return;

        try {
            this.isConnecting = true;
            const token = (await storageService?.getAccessToken?.())
                || (await SecureStore.getItemAsync('parkease_access_token'))
                || (await SecureStore.getItemAsync('userToken'));

            if (!token) {
                console.warn(TAG, 'No access token found, skipping chat hub connection.');
                this.isConnecting = false;
                return;
            }

            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(`${environment.hubsUrl}/chat`, {
                    accessTokenFactory: () => token,
                    transport: signalR.HttpTransportType.WebSockets,
                })
                .withAutomaticReconnect([0, 2000, 10000, 30000])
                .build();

            // Setup event listeners
            this.connection.on('ReceiveMessage', (message) => {
                try {
                    store.dispatch(receiveMessage(message));
                } catch (err) {
                    console.error(TAG, 'Failed to dispatch receiveMessage to store:', err);
                }

                // Notify UI subscribers
                this.listeners.forEach((listener) => {
                    try {
                        listener(message);
                    } catch (listenerErr) {
                        console.error(TAG, 'Error in chat message listener callback:', listenerErr);
                    }
                });
            });

            this.connection.onreconnecting((error) => {
                console.warn(TAG, 'Reconnecting to chat hub...', error);
                this.isConnected = false;
            });

            this.connection.onreconnected((connectionId) => {
                console.log(TAG, 'Reconnected to chat hub. Connection ID:', connectionId);
                this.isConnected = true;
                if (this.activeConversationId) {
                    this.joinConversation(this.activeConversationId);
                }
            });

            this.connection.onclose((error) => {
                console.warn(TAG, 'Chat hub connection closed.', error);
                this.isConnected = false;
                this.connection = null;
            });

            await this.connection.start();
            this.isConnected = true;
            console.log(TAG, 'Connected to chat hub.');
        } catch (error) {
            console.error(TAG, 'Failed to connect to chat hub:', error);
            this.connection = null;
            this.isConnected = false;
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Disconnect from SignalR chat hub
     */
    async disconnect() {
        if (this.connection) {
            try {
                await this.connection.stop();
            } catch (error) {
                console.error(TAG, 'Failed to disconnect from chat hub:', error);
            }
            this.connection = null;
            this.isConnected = false;
            this.activeConversationId = null;
        }
    }

    /**
     * Join conversation room
     */
    async joinConversation(conversationId) {
        if (!conversationId) return;
        this.activeConversationId = conversationId;
        if (this.isConnected && this.connection) {
            try {
                await this.connection.invoke('JoinConversation', String(conversationId));
            } catch (error) {
                console.error(TAG, 'Failed to join conversation room:', error);
            }
        }
    }

    /**
     * Leave conversation room
     */
    async leaveConversation(conversationId) {
        if (this.activeConversationId === conversationId) {
            this.activeConversationId = null;
        }
        if (this.isConnected && this.connection) {
            try {
                await this.connection.invoke('LeaveConversation', String(conversationId));
            } catch (error) {
                console.error(TAG, 'Failed to leave conversation room:', error);
            }
        }
    }

    /**
     * Subscribe to incoming messages
     * @param {Function} callback (message) => void
     * @returns {Function} unsubscribe function
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.add(callback);
        }
        return () => {
            this.listeners.delete(callback);
        };
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }
}

export default new ChatHub();
