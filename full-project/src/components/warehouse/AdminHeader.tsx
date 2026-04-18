import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

const ROUTE_TITLES: Record<string, string> = {
  '/warehouse/admin/dashboard': 'Dashboard',
  '/warehouse/admin/section/bao-cao-thong-ke': 'Báo cáo & Thống kê',
  '/warehouse/admin/section/don-hang': 'Quản lý đơn hàng',
  '/warehouse/admin/section/quan-ly-loai-container': 'Loại Container',
  '/warehouse/admin/section/quan-ly-loai-hang': 'Loại Hàng',
  '/warehouse/admin/section/quan-ly-hang-tau': 'Hãng Tàu',
  '/warehouse/admin/section/quan-ly-lich': 'Lịch Trình',
  '/warehouse/admin/section/quan-ly-cuoc-phi-bieu-cuoc': 'Cước Phí',
  '/warehouse/admin/section/quan-tri-he-thong': 'Quản trị hệ thống',
  '/warehouse/admin/section/quan-ly-tai-khoan': 'Tài khoản Admin',
};

const INITIAL_NOTIFS = [
  { id: 1, text: '⚠️ Kho lạnh đã đạt 90% công suất. Cần xử lý ngay!', time: 'Vừa xong', unread: true },
  { id: 2, text: '📦 Đơn hàng ORD-10 mới từ Hàng Hải Bình Minh', time: '15 phút trước', unread: true },
  { id: 3, text: '✅ Lệnh nhập kho container CT-001 thành công', time: '1 giờ trước', unread: true },
  { id: 4, text: '📦 Đơn hàng ORD-9 từ Cảng Sài Gòn đã được duyệt', time: '2 giờ trước', unread: false },
];

const CONTACTS = [
  { id: 'cang', label: 'Cảng SG', initials: 'CS', color: 'var(--info)', msgs: [
      { sent: false, text: 'Xin chào! Đơn ORD-9 đã sẵn sàng chưa?' },
      { sent: true, text: 'Dạ đã duyệt xong, container sẽ xuất ngày mai.' },
      { sent: false, text: 'Cảm ơn!' },
    ] },
  { id: 'dp', label: 'Điều Phối', initials: 'DP', color: 'var(--primary)', msgs: [
      { sent: true, text: 'Bạn kiểm tra kho lạnh chưa? Sắp đầy rồi.' },
      { sent: false, text: 'Đã kiểm tra, còn khoảng 10% công suất.' },
    ] },
  { id: 'nk', label: 'Nhân Viên', initials: 'NK', color: 'var(--success)', msgs: [
      { sent: false, text: 'Anh ơi, container CT-001 đã vào cổng xong.' },
      { sent: true, text: 'OK, cập nhật hệ thống đi nhé.' },
    ] },
  { id: 'lg', label: 'Logistics', initials: 'LG', color: '#888', msgs: [
      { sent: false, text: 'Chào admin, tôi cần hỗ trợ về ORD-2.' },
    ] },
  { id: 'pq', label: 'Phú Quý', initials: 'PQ', color: '#e67e22', msgs: [
      { sent: false, text: 'Khi nào container của tôi được xuất?' },
      { sent: true, text: 'Dự kiến ngày 28/03 ạ.' },
    ] },
];

export default function AdminHeader({ isDark, onThemeToggle }: { isDark: boolean; onThemeToggle: () => void }) {
  const location = useLocation();
  const title = ROUTE_TITLES[location.pathname] || 'Hùng Thủy';
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const [activeContact, setActiveContact] = useState(CONTACTS[0]);
  const [chatMsgs, setChatMsgs] = useState(CONTACTS[0].msgs);
  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifs.filter((n) => n.unread).length;
  const visibleNotifs = notifFilter === 'unread' ? notifs.filter((n) => n.unread) : notifs;

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [chatMsgs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('.notif-panel') && !target.closest('#notif-btn')) setNotifOpen(false);
      if (!target.closest('.chat-panel') && !target.closest('#chat-btn')) setChatOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const readNotif = (id: number) => setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));

  const selectContact = (contact: typeof CONTACTS[number]) => {
    setActiveContact(contact);
    setChatMsgs(contact.msgs);
  };

  const sendMsg = () => {
    const text = input.trim();
    if (!text) return;
    setChatMsgs((prev) => [...prev, { sent: true, text }]);
    setInput('');
  };

  return (
    <>
      <header className="admin-header">
        <div className="header-title">{title}</div>
        <div className="header-actions">
          <button id="notif-btn" type="button" className="icon-btn" onClick={() => { setNotifOpen((o) => !o); setChatOpen(false); }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className="notif-dot" />}
          </button>

          <button id="chat-btn" type="button" className="icon-btn" onClick={() => { setChatOpen((o) => !o); setNotifOpen(false); }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </button>

          <button type="button" className="icon-btn" onClick={onThemeToggle} aria-label="Giao diện sáng/tối">
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className={`notif-panel${notifOpen ? ' open' : ''}`}>
        <div className="notif-header-bar">
          Thông báo
          <button type="button" className="btn btn-secondary btn-sm" onClick={markAllRead}>Đọc tất cả</button>
        </div>
        <div className="notif-tabs">
          <button className={`ntab${notifFilter === 'all' ? ' active' : ''}`} type="button" onClick={() => setNotifFilter('all')}>Tất cả</button>
          <button className={`ntab${notifFilter === 'unread' ? ' active' : ''}`} type="button" onClick={() => setNotifFilter('unread')}>Chưa đọc</button>
        </div>
        {visibleNotifs.map((n) => (
          <div key={n.id} className={`notif-item${n.unread ? ' unread' : ''}`} role="button" tabIndex={0} onClick={() => readNotif(n.id)}>
            <span className={`notif-dot2${n.unread ? '' : ' hidden'}`} />
            <div>
              <div className="notif-text">{n.text}</div>
              <div className="notif-time">{n.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={`chat-panel${chatOpen ? ' open' : ''}`}>
        <div className="chat-panel-header">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Nhắn tin</span>
          <button type="button" className="modal-close" onClick={() => setChatOpen(false)}>✕</button>
        </div>
        <div className="chat-main-body">
          <div className="chat-contacts">
            <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>LIÊN LẠC</div>
            {CONTACTS.map((contact) => (
              <button
                type="button"
                key={contact.id}
                className={`chat-contact-item${activeContact.id === contact.id ? ' active' : ''}`}
                onClick={() => selectContact(contact)}
              >
                <div className="avatar" style={{ width: 22, height: 22, fontSize: 9, background: contact.color }}>{contact.initials}</div>
                {contact.label}
              </button>
            ))}
          </div>
          <div className="chat-body">
            <div className="chat-messages" ref={messagesRef}>
              {chatMsgs.map((message, index) => (
                <div key={index} className={`chat-msg${message.sent ? ' sent' : ''}`}>
                  <div className={`chat-bubble${message.sent ? ' sent' : ' recv'}`}>{message.text}</div>
                </div>
              ))}
            </div>
            <div className="chat-input-row">
              <input
                className="chat-input"
                placeholder="Nhập tin nhắn..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={sendMsg}>Gửi</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
