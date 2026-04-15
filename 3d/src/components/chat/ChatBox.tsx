import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, Bot, User, Headphones } from 'lucide-react';
import { apiFetch, decodeJwtUser, getToken } from '../../services/apiClient';

type RecipientType = 'customer' | 'dispatcher' | 'warehouse';

const ROLE_MAP: Record<RecipientType, string> = {
  customer: 'CUSTOMER',
  dispatcher: 'PLANNER',
  warehouse: 'OPERATOR',
};

const SEARCH_LABEL: Record<RecipientType, string> = {
  customer: 'Tìm khách hàng',
  dispatcher: 'Tìm điều phối',
  warehouse: 'Tìm nhân viên kho',
};

type UserItem = { userId: number; fullName: string; username: string };
type ChatMessage = { messageId: number; senderId: number; senderName: string; description: string; createdAt: string };
type ChatRoom = { roomId: number; roomName: string };

function quickRepliesFor(recipient: RecipientType, selectedName?: string) {
  if (recipient === 'dispatcher') return ['Kiểm tra lịch nhập', 'Kiểm tra lịch xuất', 'Tổng hợp hàng hỏng', 'Báo cáo tồn kho'];
  if (recipient === 'warehouse') return ['Xem tồn kho theo zone', 'Lọc container hàng hỏng', 'Thông tin giao ca', 'Kiểm tra lệnh xuất'];
  return [`Kiểm tra trạng thái container của ${selectedName || 'tôi'}`, 'Theo dõi lịch trình', 'Báo cáo hàng hỏng', 'Cần hỗ trợ thủ tục'];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

async function apiJson(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await apiFetch(path, init);
  const json = (await res.json().catch(() => ({}))) as Rec;
  return { ok: res.ok, status: res.status, data: json.data ?? json };
}

export function ChatBox() {
  const token = getToken();
  const jwtUser = token ? decodeJwtUser(token) : null;

  const [isOpen, setIsOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<RecipientType>('customer');
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUsername = jwtUser?.username || null;

  const fetchUsers = useCallback(async (role: RecipientType, query: string) => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const roleName = ROLE_MAP[role];
      const { ok, data } = await apiJson(`/chat/users?roleName=${roleName}&keyword=${encodeURIComponent(query)}&size=10`);
      if (ok) setUsers((data?.content || []) as UserItem[]);
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;
    fetchUsers(recipientType, userQuery);
  }, [isOpen, recipientType, userQuery, fetchUsers]);

  useEffect(() => {
    setUserQuery('');
    setSelectedUser(null);
    setActiveRoom(null);
    setMessages([]);
    setError('');
  }, [recipientType]);

  useEffect(() => {
    if (!selectedUser || !token) {
      setActiveRoom(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    const openRoom = async () => {
      setLoadingRoom(true);
      setError('');
      try {
        const { ok, data } = await apiJson('/chat/conversations', {
          method: 'POST',
          body: JSON.stringify({ targetUserId: selectedUser.userId }),
        });
        if (!ok || cancelled) return;
        setActiveRoom(data as ChatRoom);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Không thể mở cuộc trò chuyện');
      } finally {
        if (!cancelled) setLoadingRoom(false);
      }
    };
    openRoom();
    return () => {
      cancelled = true;
    };
  }, [selectedUser, token]);

  const fetchMessages = useCallback(async (roomId: number) => {
    if (!token) return;
    try {
      const { ok, data } = await apiJson(`/chat/rooms/${roomId}/messages?size=50`);
      if (ok) {
        const content = (data?.content || []) as ChatMessage[];
        setMessages([...content].reverse());
      }
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    if (!activeRoom) return;
    fetchMessages(activeRoom.roomId);
    const id = window.setInterval(() => fetchMessages(activeRoom.roomId), 5000);
    return () => window.clearInterval(id);
  }, [activeRoom, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 250);
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !activeRoom || sending) return;
    setInputText('');
    setSending(true);
    try {
      await apiJson(`/chat/rooms/${activeRoom.roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ description: text.trim() }),
      });
      await fetchMessages(activeRoom.roomId);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  if (!token) return null;

  return (
    <div className="topbar-chat-root">
      <button
        className="icon-btn"
        aria-label="Open chat"
        onClick={() => setIsOpen((o) => !o)}
      >
        <MessageCircle size={20} />
      </button>

      {isOpen && (
        <div className="topbar-chat-panel" role="dialog" aria-label="Chat panel">
          <div className="topbar-chat-header">
            <div className="topbar-chat-head-left">
              <div className="topbar-chat-avatar">
                <Headphones size={16} />
              </div>
              <div>
                <div className="topbar-chat-title">Hỗ trợ</div>
                <div className="topbar-chat-sub">{currentUsername ? `Bạn: ${currentUsername}` : 'Đang đăng nhập'}</div>
              </div>
            </div>
            <button className="topbar-chat-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          <div className="topbar-chat-controls">
            <div className="topbar-chat-row">
              <div className="topbar-chat-label">Nhắn tới</div>
              <select value={recipientType} onChange={(e) => setRecipientType(e.target.value as RecipientType)} className="topbar-chat-select">
                <option value="customer">Khách hàng</option>
                <option value="dispatcher">Điều phối</option>
                <option value="warehouse">Nhân viên kho</option>
              </select>
            </div>
            <div className="topbar-chat-row">
              <div className="topbar-chat-label">{SEARCH_LABEL[recipientType]}</div>
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Nhập tên để tìm kiếm"
                className="topbar-chat-input"
              />
            </div>
            <div className="topbar-chat-chips">
              {loadingUsers ? <span className="topbar-chat-hint">Đang tải...</span> : null}
              {!loadingUsers && users.length === 0 ? <span className="topbar-chat-hint">Không có kết quả.</span> : null}
              {users.map((u) => (
                <button
                  key={u.userId}
                  className={`topbar-chip ${selectedUser?.userId === u.userId ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => setSelectedUser(u)}
                >
                  {u.fullName || u.username}
                </button>
              ))}
            </div>
          </div>

          <div className="topbar-chat-body">
            {loadingRoom ? <div className="topbar-chat-empty">Đang mở cuộc trò chuyện...</div> : null}
            {!loadingRoom && error ? <div className="topbar-chat-empty is-error">{error}</div> : null}
            {!loadingRoom && !error && !activeRoom ? (
              <div className="topbar-chat-empty">Chọn người dùng để bắt đầu trò chuyện.</div>
            ) : null}

            {activeRoom && (
              <>
                {messages.map((m) => {
                  const isMe = currentUsername ? m.senderName === currentUsername : false;
                  return (
                    <div key={m.messageId} className={`topbar-chat-msg ${isMe ? 'is-me' : ''}`}>
                      <div className="topbar-chat-bubble">
                        <div className="topbar-chat-bubble-head">
                          <span className="topbar-chat-sender">
                            {isMe ? <User size={14} /> : <Bot size={14} />}
                            {m.senderName}
                          </span>
                          <span className="topbar-chat-time">{formatTime(m.createdAt)}</span>
                        </div>
                        <div className="topbar-chat-text">{m.description}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="topbar-chat-quick">
            {quickRepliesFor(recipientType, selectedUser?.fullName).map((r) => (
              <button key={r} className="topbar-quick-btn" onClick={() => sendMessage(r)} disabled={!activeRoom}>
                {r}
              </button>
            ))}
          </div>

          <form
            className="topbar-chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputText);
            }}
          >
            <input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={activeRoom ? 'Nhập tin nhắn...' : 'Chọn người dùng trước...'}
              disabled={!activeRoom}
              className="topbar-chat-compose-input"
            />
            <button className="topbar-chat-send" type="submit" disabled={!activeRoom || !inputText.trim() || sending}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

