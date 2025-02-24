import { useState, useEffect, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, GameAction, Player } from '../types/game';
import { isPlayerTurn, getGameStatus, canSeeRole } from '../utils/gameState';

interface UseAvalonGameReturn {
  gameState: GameState | null;
  isConnected: boolean;
  error: string | null;
  isMyTurn: boolean;
  gameStatus: string;
  visibleRoles: Record<string, boolean>;
  dispatch: (action: Omit<GameAction, 'payload'> & { payload: Partial<GameAction['payload']> }) => void;
  reconnect: () => void;
}

export function useAvalonGame(roomId: string, playerId: string, playerName: string): UseAvalonGameReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // เข้าร่วมเกมเมื่อเชื่อมต่อสำเร็จ
      newSocket.emit('gameAction', {
        type: 'JOIN_GAME',
        payload: { roomId, playerId, playerName }
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setError('การเชื่อมต่อล้มเหลว กำลังลองใหม่...');
    });

    newSocket.on('error', (errorMessage: string) => {
      setError(errorMessage);
    });

    newSocket.on('gameStateUpdate', (newState: GameState) => {
      setGameState(newState);
      setError(null);
    });

    setSocket(newSocket);
    return newSocket;
  }, [roomId, playerId, playerName]);

  useEffect(() => {
    const newSocket = connectSocket();
    return () => {
      newSocket.disconnect();
    };
  }, [connectSocket]);

  const dispatch = useCallback((action: Omit<GameAction, 'payload'> & { payload: Partial<GameAction['payload']> }) => {
    if (socket && isConnected) {
      console.log('Dispatching action:', { 
        type: action.type,
        payload: {
          ...action.payload,
          roomId
        }
      });
      const fullPayload = {
        ...action.payload,
        roomId
      };
      socket.emit('gameAction', { ...action, payload: fullPayload });
    } else {
      setError('ไม่สามารถส่งคำสั่งได้: ไม่ได้เชื่อมต่อ');
    }
  }, [socket, isConnected, roomId]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    connectSocket();
  }, [socket, connectSocket]);

  // คำนวณบทบาทที่ผู้เล่นสามารถเห็นได้
  const visibleRoles = useMemo(() => {
    if (!gameState) return {};

    const currentPlayer = gameState.players.find(p => p.id === playerId);
    if (!currentPlayer) return {};

    return gameState.players.reduce((acc, player) => {
      acc[player.id] = canSeeRole(currentPlayer, player);
      return acc;
    }, {} as Record<string, boolean>);
  }, [gameState, playerId]);

  const isMyTurn = gameState ? isPlayerTurn(gameState, playerId) : false;
  const gameStatus = gameState ? getGameStatus(gameState) : 'กำลังโหลด...';

  return {
    gameState,
    isConnected,
    error,
    isMyTurn,
    gameStatus,
    visibleRoles,
    dispatch,
    reconnect
  };
}
