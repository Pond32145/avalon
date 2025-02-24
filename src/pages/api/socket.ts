import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as NetServer } from 'net';
import { GameState, GameAction } from '../../types/game';
import { gameStateReducer, createInitialState } from '../../utils/gameState';

interface SocketServer extends HttpServer {
  io?: IOServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: any & {
    server: NetServer & {
      io?: IOServer;
    };
  };
}

// เก็บ state ของแต่ละห้อง
const gameStates = new Map<string, GameState>();

// ส่ง state ไปให้ทุกคนในห้อง
const broadcastGameState = (io: IOServer, roomId: string) => {
  const state = gameStates.get(roomId);
  if (state) {
    io.to(roomId).emit('gameStateUpdate', state);
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket) return res.status(500).end();

  const httpServer = res.socket.server as SocketServer;
  if (!httpServer.io) {
    const io = new IOServer(httpServer, {
      path: '/api/socket',
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    httpServer.io = io;

    io.on('connection', (socket: Socket) => {
      console.log('User connected:', socket.id);
      let currentRoomId: string | null = null;

      socket.on('gameAction', (action: GameAction) => {
        try {
          console.log('Received game action:', action);
          const { roomId } = action.payload;
          if (!roomId) {
            socket.emit('error', 'Room ID is required');
            return;
          }

          // สร้าง state ใหม่ถ้ายังไม่มี
          if (action.type === 'JOIN_GAME') {
            if (!gameStates.has(roomId)) {
              gameStates.set(roomId, createInitialState(roomId));
            }
            currentRoomId = roomId;
            socket.join(roomId);
          }

          // ตรวจสอบว่ามี state และผู้เล่นอยู่ในห้อง
          const state = gameStates.get(roomId);
          if (!state) {
            socket.emit('error', 'Game state not found');
            return;
          }

          // อัพเดท state
          const newState = gameStateReducer(state, action);
          console.log('New game state:', { 
            type: action.type,
            phase: newState.phase,
            selectedPlayers: newState.selectedPlayers,
            votes: newState.votes,
            missionResults: newState.missionResults
          });
          gameStates.set(roomId, newState);
          broadcastGameState(io, roomId);

        } catch (error) {
          console.error('Error processing game action:', error);
          socket.emit('error', 'Failed to process game action');
        }
      });

      socket.on('disconnect', () => {
        try {
          console.log('User disconnected:', socket.id);
          if (currentRoomId && gameStates.has(currentRoomId)) {
            const state = gameStates.get(currentRoomId)!;
            
            // อัพเดทสถานะผู้เล่นเป็น offline
            const newState = {
              ...state,
              players: state.players.map(p => 
                p.id === socket.id 
                  ? { ...p, isOnline: false, lastAction: Date.now() }
                  : p
              ),
              lastUpdate: Date.now()
            };
            
            gameStates.set(currentRoomId, newState);
            broadcastGameState(io, currentRoomId);

            // ลบห้องถ้าไม่มีใครออนไลน์
            const hasOnlinePlayers = newState.players.some(p => p.isOnline);
            if (!hasOnlinePlayers) {
              gameStates.delete(currentRoomId);
            }
          }
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });

      // จัดการ error
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', 'An unexpected error occurred');
      });
    });
  }

  res.end();
}
