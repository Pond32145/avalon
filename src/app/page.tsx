'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substr(2, 9);
    setCreatedRoomId(newRoomId);
    router.push(`/game/${newRoomId}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/game/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-white mb-8 animate-fade-in">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              AVALON
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-12">
            เกมแห่งการหลอกลวงและการค้นหาความจริง
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-gray-800 bg-opacity-50 p-8 rounded-xl shadow-2xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6">สร้างห้องใหม่</h2>
              <button
                onClick={createRoom}
                disabled={isCreating}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
              >
                {isCreating ? 'กำลังสร้างห้อง...' : 'สร้างห้อง'}
              </button>
              {createdRoomId && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md mt-4">
                  <p className="text-sm text-green-700">Room created! Room ID: <span className="font-mono font-bold">{createdRoomId}</span></p>
                </div>
              )}
            </div>

            <div className="bg-gray-800 bg-opacity-50 p-8 rounded-xl shadow-2xl backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6">เข้าร่วมห้อง</h2>
              <form onSubmit={joinRoom} className="space-y-4">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="ใส่รหัสห้อง"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  เข้าร่วม
                </button>
              </form>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-gray-800 bg-opacity-30 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-2">เล่นกับเพื่อน</h3>
              <p className="text-gray-400">เชิญเพื่อนเข้าร่วมห้องด้วยรหัสห้อง</p>
            </div>
            <div className="bg-gray-800 bg-opacity-30 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-2">ไม่ต้องติดตั้ง</h3>
              <p className="text-gray-400">เล่นผ่านเว็บบราวเซอร์ได้ทันที</p>
            </div>
            <div className="bg-gray-800 bg-opacity-30 p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-2">ฟรี</h3>
              <p className="text-gray-400">เล่นฟรีไม่มีค่าใช้จ่าย</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
