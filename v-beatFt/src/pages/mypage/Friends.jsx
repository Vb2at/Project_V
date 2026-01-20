import { useCallback, useEffect, useRef, useState } from 'react';
import ProfileAvatar from '../../components/Member/ProfileAvatar';
import UserProfileModal from '../../components/Common/UserProfileModal';

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';

import {
  fetchFriendList,
  fetchFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  deleteFriend,
} from '../../api/friend';

export default function Friends({ onClickMessage }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [addNick, setAddNick] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const clientRef = useRef(null);

  /* =========================
   * alert 헬퍼
   * ========================= */
  const showAlert = (msg) => {
    window.alert(msg);
  };

  function openProfile(user) {
    setProfileUser(user);
    setProfileOpen(true);
  }

  /* =========================
   * REST 갱신
   * ========================= */
  const refresh = useCallback(async () => {
    try {
      const [reqList, friendList] = await Promise.all([
        fetchFriendRequests(),
        fetchFriendList(),
      ]);

      setRequests(Array.isArray(reqList) ? reqList : []);
      setFriends(Array.isArray(friendList) ? friendList : []);
    } catch (e) {
      console.error('[REST] refresh error', e);
    }
  }, []);

  // 최초 로딩
  useEffect(() => {
    refresh();
  }, [refresh]);

  /* =========================
   * WebSocket 연결
   * ========================= */
  useEffect(() => {
    if (clientRef.current) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (str) => console.log('[STOMP]', str),

      onConnect: () => {
        console.log('[WS] connected (friend)');

        // 친구 개인 알림
        client.subscribe('/user/queue/friend', (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            const type = payload?.type;

            if (type === 'FRIEND_REQUEST_RECEIVED') {
              const fromNick = payload?.data?.fromNick ?? '상대';
              showAlert(`${fromNick}님이 친구 요청을 보냈습니다.`);
            } else if (type === 'FRIEND_REQUEST_ACCEPTED') {
              showAlert('내가 보낸 친구 요청이 수락되었습니다.');
            } else {
              showAlert('친구 알림이 도착했습니다.');
            }
          } catch {
            showAlert('친구 알림이 도착했습니다.');
          }

          refresh();
        });

        // 온라인 유저 변경
        client.subscribe('/topic/online-users', () => {
          refresh();
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      try {
        clientRef.current?.deactivate();
      } catch (e) {
        console.error('[WS] deactivate error', e);
      } finally {
        clientRef.current = null;
      }
    };
  }, [refresh]);

  /* =========================
   * REST 액션
   * ========================= */
  const handleAdd = async () => {
    const keyword = addNick.trim();
    if (!keyword) {
      showAlert('닉네임을 입력해주세요.');
      return;
    }

    try {
      const res = await sendFriendRequest(keyword);

      if (res?.ok === false) {
        showAlert(mapFriendMessage(res?.message));
        return;
      }

      showAlert('친구 신청을 보냈습니다.');
      setAddNick('');
      refresh();
    } catch (e) {
      console.error(e);
      showAlert('친구 신청 중 오류가 발생했습니다.');
    }
  };

  const handleAccept = async (id) => {
    if (id == null) return;
    try {
      await acceptFriendRequest(id);
      showAlert('친구 요청을 수락했습니다.');
      refresh();
    } catch (e) {
      console.error(e);
      showAlert('수락 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async (id) => {
    if (id == null) return;
    try {
      await rejectFriendRequest(id);
      showAlert('친구 요청을 거절했습니다.');
      refresh();
    } catch (e) {
      console.error(e);
      showAlert('거절 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (targetId) => {
    if (targetId == null) return;

    if (!window.confirm('정말 친구를 삭제하시겠습니까?')) return;

    try {
      await deleteFriend(targetId);
      showAlert('친구를 삭제했습니다.');
      refresh();
    } catch (e) {
      console.error(e);
      showAlert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={wrap}>
      {/* 친구 추가 */}
      <div style={addWrap}>
        <input
          value={addNick}
          onChange={(e) => setAddNick(e.target.value)}
          placeholder="닉네임 입력"
          style={input}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button style={btnMain} onClick={handleAdd}>
          추가
        </button>
      </div>

      {/* 친구 요청 */}
      <Section title="친구 요청">
        {requests.length === 0 && <Empty>요청 없음</Empty>}
        {requests.map((u) => (
          <Row key={u.id}>
            <UserInfo nick={u.otherNickName ?? u.nickName ?? u.nick} />
            <div style={{ display: 'flex', gap: 8 }}>
              <BtnMain onClick={() => handleAccept(u.id)}>수락</BtnMain>
              <BtnSub onClick={() => handleReject(u.id)}>거절</BtnSub>
            </div>
          </Row>
        ))}
      </Section>

      {/* 친구 목록 */}
      <Section title="친구 목록">
        {friends.length === 0 && <Empty>친구 없음</Empty>}
        {friends.map((u) => {
          const nick = u.otherNickName ?? u.nickName ?? u.nick;

          return (
            <Row key={u.otherUserId ?? u.id}>
              <div style={{ cursor: 'pointer' }} onClick={() => openProfile(u)}>
                <UserInfo nick={nick} online={u.online} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <BtnSub
                  onClick={() => {
                    if (!nick) return;
                    onClickMessage?.(nick); // ✅ MyPage로 위임
                  }}
                >
                  쪽지
                </BtnSub>

                <BtnSub onClick={() => handleDelete(u.otherUserId ?? u.id)}>
                  삭제
                </BtnSub>
              </div>
            </Row>
          );
        })}
      </Section>

      <UserProfileModal
        open={profileOpen}
        user={profileUser}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}

/* ================= UI ================= */

function Section({ title, children }) {
  return (
    <div style={section}>
      <div style={titleStyle}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ children }) {
  return <div style={row}>{children}</div>;
}

function UserInfo({ nick, online }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <ProfileAvatar size={36} />
      <span>{nick}</span>
      {online && <Dot />}
    </div>
  );
}

function Dot() {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#3cff6a',
        boxShadow: '0 0 6px rgba(60,255,106,0.8)',
      }}
    />
  );
}

function Empty({ children }) {
  return <div style={{ opacity: 0.5 }}>{children}</div>;
}

/* ================= utils ================= */

function mapFriendMessage(code) {
  switch (code) {
    case 'needLogin':
      return '로그인이 필요합니다.';
    case 'emp':
      return '닉네임을 입력해주세요.';
    case 'notFound':
      return '해당 유저를 찾을 수 없습니다.';
    case 'self':
      return '자기 자신에게는 요청할 수 없습니다.';
    case 'alreadyFriend':
      return '이미 친구입니다.';
    case 'alreadyRequested':
      return '이미 친구 요청을 보냈습니다.';
    case 'incomingExists':
      return '상대가 이미 나에게 요청을 보냈습니다.';
    default:
      return '요청에 실패했습니다.';
  }
}

/* ================= styles ================= */

const wrap = { display: 'flex', flexDirection: 'column', gap: 20 };

const section = {
  background: 'rgba(0,0,0,0.25)',
  borderRadius: 10,
  padding: 12,
};

const titleStyle = { fontWeight: 600, marginBottom: 8 };

const row = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 4px',
};

const BtnMain = ({ children, ...props }) => (
  <button style={btnMain} {...props}>
    {children}
  </button>
);
const BtnSub = ({ children, ...props }) => (
  <button style={btnSub} {...props}>
    {children}
  </button>
);

const ACCENT = '#5aeaff';

const btnMain = {
  padding: '6px 14px',
  borderRadius: 6,
  background: 'rgba(90,234,255,0.15)',
  border: `1px solid ${ACCENT}`,
  color: ACCENT,
  cursor: 'pointer',
};

const btnSub = {
  padding: '6px 14px',
  borderRadius: 6,
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.25)',
  color: '#ccc',
  cursor: 'pointer',
};

const addWrap = { display: 'flex', gap: 8, marginBottom: 12 };

const input = {
  flex: 1,
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#fff',
  outline: 'none',
};
