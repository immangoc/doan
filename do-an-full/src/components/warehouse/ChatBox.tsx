import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, Phone, Mail, Headphones } from 'lucide-react';
import { useWarehouseAuth, API_BASE } from '../../contexts/WarehouseAuthContext';

type RecipientType = 'customer' | 'dispatcher' | 'warehouse';

const ROLE_MAP: Record<RecipientType, string> = {
  customer:   'CUSTOMER',
  dispatcher: 'PLANNER',
  warehouse:  'OPERATOR',
};

const SEARCH_LABEL: Record<RecipientType, string> = {
  customer:   'Tìm khách hàng',
  dispatcher: 'Tìm điều phối',
  warehouse:  'Tìm nhân viên kho',
};

type UserItem = { userId: number; fullName: string; username: string };
type ChatMessage = { messageId: number; senderId: number; senderName: string; description: string; createdAt: string };
type ChatRoom = { roomId: number; roomName: string };

function quickRepliesFor(recipient: RecipientType, selectedName?: string) {
  if (recipient === 'dispatcher') return ['Kiểm tra lịch nhập', 'Kiểm tra lịch xuất', 'Tổng hợp hàng hỏng', 'Báo cáo tồn kho'];
  if (recipient === 'warehouse')  return ['Xem tồn kho theo zone', 'Lọc container hàng hỏng', 'Thông tin giao ca', 'Kiểm tra lệnh xuất'];
  return [`Kiểm tra trạng thái container của ${selectedName || 'tôi'}`, 'Theo dõi lịch trình', 'Báo cáo hàng hỏng', 'Cần hỗ trợ thủ tục'];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBox() {
  const { accessToken, user } = useWarehouseAuth();

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const [isOpen, setIsOpen]               = useState(false);
  const [recipientType, setRecipientType] = useState<RecipientType>('customer');
  const [userQuery, setUserQuery]         = useState('');
  const [users, setUsers]                 = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers]   = useState(false);
  const [selectedUser, setSelectedUser]   = useState<UserItem | null>(null);
  const [activeRoom, setActiveRoom]       = useState<ChatRoom | null>(null);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [loadingRoom, setLoadingRoom]     = useState(false);
  const [inputText, setInputText]         = useState('');
  const [sending, setSending]             = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // ── Fetch users when role or query changes ─────────────────────────────────
  const fetchUsers = useCallback(async (role: RecipientType, query: string) => {
    if (!accessToken) return;
    setLoadingUsers(true);
    try {
      const roleName = ROLE_MAP[role];
      const res = await fetch(
        `${API_BASE}/chat/users?roleName=${roleName}&keyword=${encodeURIComponent(query)}&size=10`,
        { headers },
      );
      const d = await res.json();
      if (res.ok) setUsers((d.data?.content || []) as UserItem[]);
    } catch { /* ignore */ } finally {
      setLoadingUsers(false);
    }
  }, [accessToken, headers]);

  useEffect(() => {
    if (!isOpen) return;
    fetchUsers(recipientType, userQuery);
  }, [isOpen, recipientType, userQuery]);

  // Reset when role changes
  useEffect(() => {
    setUserQuery('');
    setSelectedUser(null);
    setActiveRoom(null);
    setMessages([]);
  }, [recipientType]);

  // ── Open conversation when user is selected ────────────────────────────────
  useEffect(() => {
    if (!selectedUser || !accessToken) {
      setActiveRoom(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    const openRoom = async () => {
      setLoadingRoom(true);
      try {
        const res = await fetch(`${API_BASE}/chat/conversations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ targetUserId: selectedUser.userId }),
        });
        const d = await res.json();
        if (!res.ok || cancelled) return;
        const room = d.data as ChatRoom;
        setActiveRoom(room);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoadingRoom(false);
      }
    };
    openRoom();
    return () => { cancelled = true; };
  }, [selectedUser, accessToken]);

  // ── Load & poll messages ───────────────────────────────────────────────────
  const fetchMessages = useCallback(async (roomId: number) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/chat/rooms/${roomId}/messages?size=50`, { headers });
      const d = await res.json();
      if (res.ok) {
        const content = (d.data?.content || []) as ChatMessage[];
        setMessages([...content].reverse()); // backend returns DESC; show oldest-first
      }
    } catch { /* ignore */ }
  }, [accessToken, headers]);

  useEffect(() => {
    if (!activeRoom) return;
    fetchMessages(activeRoom.roomId);
    const id = setInterval(() => fetchMessages(activeRoom.roomId), 5000);
    return () => clearInterval(id);
  }, [activeRoom, fetchMessages]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // ── Send message ───────────────────────────────────────────────────────────
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const currentUserId = (user as any)?.userId ?? (user as any)?.id;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-[460px] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
            style={{ height: '560px' }}
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
              <div className="flex items-center gap-2">
                <a href="tel:19001234" className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
                  <Phone className="w-4 h-4 text-white" />
                </a>
                <a href="mailto:info@hungthuy.com" className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
                  <Mail className="w-4 h-4 text-white" />
                </a>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Recipient selector */}
            <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-200">Nhắn tới</div>
                  <select
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                    className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  >
                    <option value="customer">Khách hàng</option>
                    <option value="dispatcher">Điều phối</option>
                    <option value="warehouse">Nhân viên kho</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-200">
                      {SEARCH_LABEL[recipientType]}
                    </div>
                    {loadingUsers && <span className="text-xs text-gray-400">Đang tải...</span>}
                    {!loadingUsers && <span className="text-xs text-gray-400">{users.length} kết quả</span>}
                  </div>
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Nhập tên để tìm kiếm"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2 max-h-[60px] overflow-y-auto">
                    {users.map((u) => (
                      <button
                        key={u.userId}
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className={`text-xs px-3 py-1.5 rounded-full border ${
                          selectedUser?.userId === u.userId
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-white text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {u.fullName || u.username}
                      </button>
                    ))}
                    {!loadingUsers && users.length === 0 && (
                      <span className="text-xs text-gray-400">Không tìm thấy người dùng.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {loadingRoom && (
                <div className="text-xs text-gray-400 text-center pt-4">Đang mở cuộc trò chuyện...</div>
              )}
              {!loadingRoom && !activeRoom && (
                <div className="text-xs text-gray-400 text-center pt-4">Chọn người dùng để bắt đầu trò chuyện.</div>
              )}
              {!loadingRoom && activeRoom && messages.length === 0 && (
                <div className="text-xs text-gray-400 text-center pt-4">Chưa có tin nhắn nào.</div>
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
                      isMe ? 'bg-gray-400' : 'bg-blue-900'
                    }`}>
                      {isMe ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {!isMe && (
                        <span className="text-[10px] text-gray-500 px-1">{msg.senderName}</span>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                        isMe
                          ? 'bg-blue-900 text-white rounded-tr-sm'
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

            {/* Quick Replies */}
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto">
              {quickRepliesFor(recipientType, selectedUser?.fullName).map((reply) => (
                <button
                  key={reply}
                  onClick={() => sendMessage(reply)}
                  disabled={!activeRoom}
                  className="flex-shrink-0 text-xs px-3 py-1.5 border border-blue-200 text-blue-700 rounded-full hover:bg-blue-50 transition-colors whitespace-nowrap disabled:opacity-40"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeRoom ? 'Nhập tin nhắn...' : 'Chọn người dùng trước...'}
                disabled={!activeRoom}
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
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 bg-gradient-to-br from-blue-900 to-blue-600 hover:from-blue-800 hover:to-blue-500 rounded-full shadow-2xl flex items-center justify-center relative"
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
