import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room, ChatMessage } from '../types/game';

export const useGameState = (roomId: string, playerName: string) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // สร้าง socket connection
  const connectSocket = useCallback(() => {
    const newSocket = io({ 
      path: '/api/socket',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      newSocket.emit('joinRoom', roomId, playerName);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setError('Connection failed. Retrying...');
    });

    newSocket.on('error', (errorMessage: string) => {
      setError(errorMessage);
    });

    newSocket.on('roomUpdate', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setError(null);
    });

    newSocket.on('chatUpdate', (message: ChatMessage) => {
      setRoom((prev) => prev ? {
        ...prev,
        chat: [...prev.chat, message]
      } : null);
    });

    setSocket(newSocket);
    return newSocket;
  }, [roomId, playerName]);

  useEffect(() => {
    const newSocket = connectSocket();
    return () => {
      newSocket.disconnect();
    };
  }, [connectSocket]);

  const sendMessage = useCallback((message: string) => {
    if (socket && isConnected) {
      socket.emit('sendMessage', roomId, message);
    } else {
      setError('Cannot send message: Not connected');
    }
  }, [socket, isConnected, roomId]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    connectSocket();
  }, [socket, connectSocket]);

  return { 
    room, 
    sendMessage, 
    isConnected,
    error,
    reconnect
  };
};
