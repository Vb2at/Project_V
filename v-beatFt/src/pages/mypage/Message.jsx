import { useEffect, useRef, useState } from 'react';

// ✅ 친구 목록 가져오기(이미 친구 페이지에서 쓰는 API)
import { fetchFriendList } from '../../api/friend';

/**
 * ✅ 백엔드 REST 기준
 * - GET  /api/messages/inbox
 * - GET  /api/messages/sent
 * - GET  /api/messages/detail?id=...
 * - POST /api/messages/send (toNickName, title?, content)
 * - POST /api/messages/read (id)
 * - POST /api/messages/delete (id)   ✅ 받은쪽지 삭제
 *
 * ✅ WS는 MyPage에서만 구독 (/user/queue/notify)
 * - Message는 refreshKey로만 갱신
 */

// ============================
// REST API helper (credentials 포함)
// ============================
const BASE = '/api/messages';

async function req(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  return res.json();
}

const fetchInbox = () => req(`${BASE}/inbox`);
const fetchSent = () => req(`${BASE}/sent`);
const fetchDetail = (id) => req(`${BASE}/detail?id=${encodeURIComponent(id)}`);
const markRead = (id) => req(`${BASE}/read?id=${encodeURIComponent(id)}`, { method: 'POST' });
const deleteMessage = (id) => req(`${BASE}/delete?id=${encodeURIComponent(id)}`, { method: 'POST' });

// 서버가 @RequestParam으로 받는 구조면 form/urlencoded가 제일 안전
async function sendMessage({ toNickName, content, title }) {
  const params = new URLSearchParams();
  params.set('toNickName', toNickName ?? '');
  params.set('content', content ?? '');
  if (title != null) params.set('title', title);

  const res = await fetch(`${BASE}/send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// ============================
// 화면 코드 (refreshKey + onReadDone 지원)
// ============================
export default function Message({ refreshKey = 0, onReadDone }) {
  const [tab, setTab] = useState('inbox'); // inbox | sent

  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);

  // ✅ 친구 목록(받는 사람 옵션용)
  const [friends, setFriends] = useState([]);

  const list = tab === 'inbox' ? inbox : sent;

  const [selectedId, setSelectedId] = useState(null);
  const selected = list.find((m) => m.id === selectedId) || null;

  // 상세 내용(서버 detail)
  const [detail, setDetail] = useState(null);

  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [toUser, setToUser] = useState('');
  const [content, setContent] = useState('');

  // ✅ 답장용: 받은쪽지의 fromNick
  const replyNickRef = useRef('');

  // =========================
  // REST 로딩/갱신
  // =========================
  const refresh = async () => {
    try {
      const [inb, snt] = await Promise.all([fetchInbox(), fetchSent()]);
      const nextInbox = Array.isArray(inb) ? inb : [];
      const nextSent = Array.isArray(snt) ? snt : [];

      setInbox(nextInbox);
      setSent(nextSent);

      // ✅ 선택 유지 보정: 현재 탭의 리스트에서 selectedId가 사라졌으면 첫 번째로
      const curList = tab === 'inbox' ? nextInbox : nextSent;
      if (curList.length === 0) {
        setSelectedId(null);
        setDetail(null);
        return;
      }
      if (selectedId == null || !curList.some((m) => m.id === selectedId)) {
        setSelectedId(curList[0].id);
        setDetail(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ 친구 목록 로딩(받는 사람 select 옵션)
  const refreshFriends = async () => {
    try {
      const friendList = await fetchFriendList();
      setFriends(Array.isArray(friendList) ? friendList : []);
    } catch (e) {
      console.error(e);
      setFriends([]);
    }
  };

  // 최초 로딩
  useEffect(() => {
    refresh();
    refreshFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ MyPage에서 NEW_MESSAGE 받았을 때 refreshKey가 증가 → 즉시 목록 갱신
  useEffect(() => {
    // refreshKey 변경 시 받은쪽지함이 즉시 반영되게 refresh
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // 탭 변경 시 선택값 보정
  useEffect(() => {
    const newList = tab === 'inbox' ? inbox : sent;

    if (newList.length === 0) {
      setSelectedId(null);
      setDetail(null);
      return;
    }

    const exists = selectedId != null && newList.some((m) => m.id === selectedId);
    if (!exists) {
      setSelectedId(newList[0].id);
      setDetail(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, inbox, sent]);

  // selectedId 변경되면 상세 조회 + (inbox면) 읽음 처리
  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }

    (async () => {
      try {
        const d = await fetchDetail(selectedId);
        setDetail(d || null);

        const fromNick =
          d?.fromNickName ??
          d?.from ??
          d?.fromNick ??
          (tab === 'inbox' ? (selected?.from ?? '') : '');
        replyNickRef.current = fromNick || '';

        // ✅ 받은쪽지면 읽음 처리 + (중요) MyPage의 ! 갱신(onReadDone) 호출
        if (tab === 'inbox') {
          await markRead(selectedId).catch(() => {});
          await onReadDone?.();      // ✅ unread-count 다시 동기화 (왼쪽 ! 즉시 갱신)
          await refresh();           // ✅ 리스트에 isRead 반영
        }
      } catch (e) {
        console.error(e);
        setDetail(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tab]);

  // =========================
  // 보내기
  // =========================
  const handleSend = async () => {
    const toNickName = (toUser || '').trim();
    const body = (content || '').trim();

    if (!toNickName) {
      window.alert('받는 사람을 선택해주세요.');
      return;
    }
    if (!body) {
      window.alert('쪽지 내용을 입력해주세요.');
      return;
    }

    try {
      const res = await sendMessage({ toNickName, content: body, title: null });

      if (res?.ok === false) {
        window.alert(mapSendMessage(res?.message));
        return;
      }

      window.alert('쪽지를 보냈습니다.');
      setIsWriteOpen(false);
      setToUser('');
      setContent('');
      await refresh();
      setTab('sent');
    } catch (e) {
      console.error(e);
      window.alert('쪽지 전송 중 오류가 발생했습니다.');
    }
  };

  // =========================
  // 삭제
  // =========================
  const handleDelete = async () => {
    if (selectedId == null) return;

    // inbox만 먼저 열어두는 정책(보낸쪽 삭제는 백엔드 정책 결정 후)
    if (tab !== 'inbox') {
      window.alert('보낸 쪽지 삭제는 아직 지원하지 않습니다.');
      return;
    }

    const ok = window.confirm('이 쪽지를 삭제할까요?');
    if (!ok) return;

    try {
      const res = await deleteMessage(selectedId);
      if (res?.ok === false) {
        window.alert('삭제에 실패했습니다.');
        return;
      }

      window.alert('삭제되었습니다.');

      await refresh();
      await onReadDone?.(); // ✅ 삭제로 인해 unread가 바뀔 수 있으니 한번 동기화
    } catch (e) {
      console.error(e);
      window.alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={wrap}>
      {/* 상단 탭 */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={tabWrap}>
          <Tab active={tab === 'inbox'} onClick={() => setTab('inbox')}>
            받은 쪽지
          </Tab>
          <Tab active={tab === 'sent'} onClick={() => setTab('sent')}>
            보낸 쪽지
          </Tab>
        </div>
        <button
          style={btnMain}
          onClick={() => {
            setIsWriteOpen(true);
            setToUser('');
            setContent('');
            refreshFriends();
          }}
        >
          쪽지 쓰기
        </button>
      </div>

      {/* 본문 */}
      <div style={panelWrap}>
        {/* 왼쪽 리스트 */}
        <div style={listPanel}>
          {list.map((m) => {
            const name =
              tab === 'inbox'
                ? (m.fromNickName ?? m.from ?? 'Unknown')
                : (m.toNickName ?? m.to ?? 'Unknown');

            const preview = m.preview ?? m.content ?? '';
            const date = m.date ?? m.regDate ?? '';
            const isRead = tab === 'inbox' ? !!m.isRead : true;

            return (
              <div
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                style={{
                  ...listItem,
                  background: m.id === selectedId ? 'rgba(90,234,255,0.12)' : 'transparent',
                  fontWeight: isRead ? 400 : 700,
                }}
              >
                {/* ✅ 이름 + 날짜를 한 줄에서 정렬 */}
                <div style={rowTop}>
                  <div style={{ fontSize: 13 }}>
                    {tab === 'inbox' ? `From. ${name}` : `To. ${name}`}
                  </div>
                  <div style={dateTop}>{date}</div>
                </div>

                <div style={previewText}>{preview}</div>
              </div>
            );
          })}
        </div>

        {/* 오른쪽 상세 */}
        <div style={detailPanel}>
          {selectedId != null ? (
            <>
              {/* ✅ 헤더: 좌측 From/To, 우측 날짜 */}
              <div style={detailHeader}>
                <span>
                  {tab === 'inbox'
                    ? `From. ${(detail?.fromNickName ?? selected?.fromNickName ?? selected?.from ?? 'Unknown')}`
                    : `To. ${(detail?.toNickName ?? selected?.toNickName ?? selected?.to ?? 'Unknown')}`}
                </span>

                <span style={{ fontSize: 12, opacity: 0.6 }}>
                  {detail?.regDate ?? selected?.regDate ?? selected?.date ?? ''}
                </span>
              </div>

              <div style={detailBody}>
                {detail?.content ?? selected?.content ?? selected?.preview ?? ''}
              </div>

              {/* ✅ 하단 버튼 */}
              <div style={detailFooterRow}>
                {tab === 'inbox' && (
                  <button
                    style={btnMain}
                    onClick={() => {
                      setIsWriteOpen(true);
                      setToUser(replyNickRef.current || '');
                      setContent('');
                      refreshFriends();
                    }}
                  >
                    답장
                  </button>
                )}

                <button style={btnSubDanger} onClick={handleDelete}>
                  삭제
                </button>
              </div>
            </>
          ) : (
            <div style={{ opacity: 0.5 }}>쪽지를 선택해주세요</div>
          )}
        </div>

        {/* 쓰기 모달 */}
        {isWriteOpen && (
          <div style={modalBg}>
            <div style={modalBox}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>쪽지 쓰기</div>

              <select value={toUser} onChange={(e) => setToUser(e.target.value)} style={input}>
                <option value="">받는 사람 선택</option>

                {friends.map((f) => {
                  const nick = f.otherNickName ?? f.nickName ?? f.nick;
                  if (!nick) return null;
                  const key = `${f.otherUserId ?? nick}`;
                  return (
                    <option key={key} value={nick}>
                      {nick}
                    </option>
                  );
                })}
              </select>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="쪽지 내용을 입력하세요"
                style={{ ...input, height: 120, resize: 'none' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  style={btnSub}
                  onClick={() => {
                    setIsWriteOpen(false);
                    setToUser('');
                    setContent('');
                  }}
                >
                  취소
                </button>
                <button style={btnMain} onClick={handleSend}>
                  보내기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= 공통 ================= */

function Tab({ active, children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: '8px 18px',
        borderRadius: 8,
        border: active ? '1px solid #5aeaff' : '1px solid rgba(255,255,255,0.2)',
        background: active ? 'rgba(90,234,255,0.15)' : 'transparent',
        color: active ? '#5aeaff' : '#aaa',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ================= utils ================= */

function mapSendMessage(code) {
  switch (code) {
    case 'needLogin':
      return '로그인이 필요합니다.';
    case 'emptyTo':
      return '받는 사람을 선택해주세요.';
    case 'emptyContent':
      return '쪽지 내용을 입력해주세요.';
    case 'notFound':
      return '받는 사람을 찾을 수 없습니다.';
    case 'self':
      return '자기 자신에게는 보낼 수 없습니다.';
    default:
      return '쪽지 전송에 실패했습니다.';
  }
}

/* ================= styles ================= */

const wrap = {
  width: '100%',
  maxWidth: 900,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const tabWrap = {
  display: 'flex',
  gap: 8,
};

const panelWrap = {
  display: 'flex',
  height: 420,
  borderRadius: 14,
  overflow: 'hidden',
  background: 'rgba(20,22,28,0.7)',
  boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
};

const listPanel = {
  width: 260,
  borderRight: '1px solid rgba(255,255,255,0.08)',
  overflowY: 'auto',
};

const listItem = {
  padding: '10px 12px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const rowTop = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
};

const dateTop = {
  fontSize: 11,
  opacity: 0.55,
  whiteSpace: 'nowrap',
};

const previewText = {
  fontSize: 12,
  opacity: 0.7,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const detailPanel = {
  flex: 1,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
};

const detailHeader = {
  fontSize: 14,
  fontWeight: 600,
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 12,
};

const detailBody = {
  flex: 1,
  fontSize: 14,
  lineHeight: 1.6,
  opacity: 0.9,
};

const detailFooterRow = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

const btnMain = {
  padding: '8px 18px',
  borderRadius: 8,
  background: 'rgba(90,234,255,0.15)',
  border: '1px solid #5aeaff',
  color: '#5aeaff',
  cursor: 'pointer',
};

const btnSub = {
  padding: '8px 18px',
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.25)',
  color: '#aaa',
  cursor: 'pointer',
};

const btnSubDanger = {
  padding: '8px 18px',
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.25)',
  color: '#aaa',
  cursor: 'pointer',
};

const modalBg = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 50,
};

const modalBox = {
  width: 360,
  background: 'rgba(20,22,28,0.95)',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const input = {
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#fff',
  outline: 'none',
};
