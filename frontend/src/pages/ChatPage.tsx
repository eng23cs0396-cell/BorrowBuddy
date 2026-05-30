import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  _id: string;
  roomId: string;
  message: string;
  createdAt: string;
  sender: {
    _id: string;
    name: string;
    email: string;
  };
}

const ChatPage = () => {
  const { token, user } = useAuth();
  const [roomId, setRoomId] = useState('global-room');
  const [activeRoom, setActiveRoom] = useState('global-room');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canChat = useMemo(() => Boolean(token && user), [token, user]);

  const loadHistory = async (selectedRoom: string) => {
    try {
      setError('');
      const { data } = await api.get(`/api/chat/rooms/${selectedRoom}/messages`);
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load chat history');
    }
  };

  useEffect(() => {
    if (!canChat || !token) return;
    const socket = io(API_BASE_URL);
    socketRef.current = socket;

    socket.on('room_joined', (payload) => {
      setInfo(`Joined room: ${payload.roomId}`);
    });

    socket.on('receive_message', (incoming: ChatMessage) => {
      setMessages((prev) => [...prev, incoming]);
    });

    socket.on('chat_error', (payload) => {
      setError(payload?.message || 'Chat error occurred');
    });

    return () => {
      socket.disconnect();
    };
  }, [canChat, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const joinRoom = async () => {
    if (!token || !socketRef.current) return;
    const trimmedRoom = roomId.trim();
    if (!trimmedRoom) return;
    setActiveRoom(trimmedRoom);
    socketRef.current.emit('join_room', { roomId: trimmedRoom, token });
    await loadHistory(trimmedRoom);
  };

  const sendMessage = () => {
    if (!token || !socketRef.current) return;
    if (!message.trim()) return;
    socketRef.current.emit('send_message', {
      roomId: activeRoom,
      token,
      message: message.trim(),
    });
    setMessage('');
  };

  if (!canChat) {
    return <p className="text-slate-300">Please login to use chat.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Real-time Chat</h2>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room id"
            className="flex-1 rounded-lg bg-slate-800 px-3 py-2 outline-none"
          />
          <button onClick={joinRoom} className="rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-700">
            Join Room
          </button>
        </div>
        <p className="text-xs text-slate-400">Active room: {activeRoom}</p>
        {info && <p className="text-emerald-400 text-sm">{info}</p>}
        {error && <p className="text-rose-400 text-sm">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 h-[420px] overflow-y-auto space-y-2">
        {messages.map((msg) => {
          const mine = msg.sender?._id === user?.id;
          return (
            <div
              key={msg._id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                mine ? 'ml-auto bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <p className="text-xs text-slate-200 mb-1">{msg.sender?.name || 'Unknown'}</p>
              <p>{msg.message}</p>
            </div>
          );
        })}
        {messages.length === 0 && <p className="text-slate-400">No messages yet for this room.</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-lg bg-slate-800 px-3 py-2 outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
        />
        <button onClick={sendMessage} className="rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-700">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPage;

