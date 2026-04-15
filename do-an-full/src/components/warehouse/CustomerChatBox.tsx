import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, Headphones } from 'lucide-react';
import { useWarehouseAuth, API_BASE } from '../../contexts/WarehouseAuthContext';

type ChatMessage = {
  messageId: number;
  senderId: number;
  senderName: string;
  description: string;
  createdAt: string;
};

type ChatRoom = { roomId: number; roomName: string };

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const QUICK_REPLIES = ['Kiểm tra đơn hàng', 'Trạng thái container', 'Cần hỗ trợ thủ tục'];

export default function CustomerChatBox() {
  const { accessToken, user } = useWarehouseAuth();

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [isOpen, setIsOpen]       = useState(false);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  const currentUserId = parseInt(String((user as any)?.userId ?? (user as any)?.id ?? ''), 10) || null;

  // ── Find admin then open/create conversation ──────────────────────────────
  const initConversation = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const uRes = await fetch(`${API_BASE}/chat/users?roleName=ADMIN&size=5`, { headers });
      const uData = await uRes.json();
      if (!uRes.ok) throw new Error('Không thể tìm admin');
      const admins = (uData.data?.content || []) as { userId: number }[];
      if (admins.length === 0) throw new Error('Hiện chưa có admin trực tuyến');

      const cRes = await fetch(`${API_BASE}/chat/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetUserId: admins[0].userId }),
      });
      const cData = await cRes.json();
      if (!cRes.ok) throw new Error('Không thể mở cuộc trò chuyện');
      setActiveRoom(cData.data as ChatRoom);
    } catch (e: any) {
      setError(e.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }, [accessToken, headers]);

  // ── Fetch messages ────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (roomId: number) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/chat/rooms/${roomId}/messages?size=50`, { headers });
      const d = await res.json();
      if (res.ok) {
        const content = (d.data?.content || []) as ChatMessage[];
        setMessages([...content].reverse()); // backend DESC → show oldest-first
      }
    } catch { /* ignore */ }
  }, [accessToken, headers]);

  // Init on first open
  useEffect(() => {
    if (!isOpen || activeRoom) return;
    initConversation();
  }, [isOpen]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!activeRoom) return;
    fetchMessages(activeRoom.roomId);
    const id = setInterval(() => fetchMessages(activeRoom.roomId), 5000);
    return () => clearInterval(id);
  }, [activeRoom, fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || !activeRoom || sending) return;
    setInputText('');
    setSending(true);
    try {
      await fetch(`${API_BASE}/chat/rooms/${activeRoom.roomId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ description: text.trim() }),
      });
      await fetchMessages(activeRoom.roomId);
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  if (!accessToken) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-[380px] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
            style={{ height: '480px' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Hỗ trợ Hùng Thủy</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-blue-200 text-xs">Đang hoạt động</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {loading && (
                <div className="text-xs text-gray-400 text-center pt-6">Đang kết nối với admin...</div>
              )}
              {!loading && error && (
                <div className="flex flex-col items-center gap-2 pt-6">
                  <div className="text-xs text-red-500 text-center">{error}</div>
                  <button
                    onClick={initConversation}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Thử lại
                  </button>
                </div>
              )}
              {!loading && !error && messages.length === 0 && (
                <div className="text-xs text-gray-400 text-center pt-6">
                  Chưa có tin nhắn nào. Hãy gửi câu hỏi đầu tiên!
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <motion.div
                    key={msg.messageId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isMe ? 'bg-purple-500' : 'bg-blue-900'
                    }`}>
                      {isMe
                        ? <User className="w-4 h-4 text-white" />
                        : <Bot className="w-4 h-4 text-white" />
                      }
                    </div>
                    <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <span className="text-[10px] text-gray-500 px-1">{msg.senderName}</span>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                        isMe
                          ? 'bg-purple-600 text-white rounded-tr-sm'
                          : 'bg-white text-gray-800 shadow-sm rounded-tl-sm'
                      }`}>
                        {msg.description}
                      </div>
                      <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto">
              {QUICK_REPLIES.map((r) => (
                <button
                  key={r}
                  onClick={() => sendMessage(r)}
                  disabled={!activeRoom}
                  className="flex-shrink-0 text-xs px-3 py-1.5 border border-blue-200 text-blue-700 rounded-full hover:bg-blue-50 transition-colors whitespace-nowrap disabled:opacity-40"
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(inputText); }}
              className="p-3 bg-white border-t border-gray-100 flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeRoom ? 'Nhập tin nhắn...' : 'Đang kết nối...'}
                disabled={!activeRoom || loading}
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || !activeRoom || sending}
                className="w-9 h-9 bg-blue-900 hover:bg-blue-800 disabled:bg-gray-200 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 bg-gradient-to-br from-blue-900 to-blue-600 hover:from-blue-800 hover:to-blue-500 rounded-full shadow-2xl flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <MessageCircle className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
