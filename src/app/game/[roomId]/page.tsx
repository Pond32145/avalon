'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import GameRoom from '../../../components/GameRoom';

export default function GamePage() {
  const params = useParams();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const roomId = params?.roomId as string;

  useEffect(() => {
    // ดึงข้อมูลจาก localStorage เมื่อ component mount
    const storedPlayerId = localStorage.getItem('playerId');
    const storedPlayerName = localStorage.getItem('playerName');
    if (storedPlayerId && storedPlayerName) {
      setPlayerId(storedPlayerId);
      setPlayerName(storedPlayerName);
    }
  }, []);

  if (!roomId || !playerId || !playerName) {
    return <div>Loading...</div>;
  }

  return <GameRoom roomId={roomId} playerId={playerId} playerName={playerName} />;
}
