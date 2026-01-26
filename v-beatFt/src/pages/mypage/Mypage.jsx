// pages/member/MyPage.jsx
import { useEffect, useRef, useState } from 'react';
import Header from '../../components/Common/Header';
import Visualizer from '../../components/visualizer/Visualizer';
import ProfileSection from './ProfileSection';
import Background from '../../components/Common/Background';
import Message from './Message';
import Friends from './Friends';
import MyGames from './MyGames';
import Records from './Records';
import Policy from './Policy';
import Manager from './Manager';

import {
  getMenuAnalyser,
  playMenuBgmRandom,
  isMenuBgmPlaying,
} from '../../components/engine/SFXManager';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamation } from '@fortawesome/free-solid-svg-icons';

import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';

export default function MyPage() {
  const analyserRef = useRef(null);
  const location = useLocation();

  const [tab, setTab] = useState(location.state?.tab ?? 'profile');
  const tabRef = useRef(tab);

  const [status, setStatus] = useState(null);

  // ✅ notify: count 기반
  const [notify, setNotify] = useState({
    unreadMessages: 0,
    pendingFriends: 0, // ✅ 친구요청 알림 뱃지 카운트
    adminAlerts: 0, // ✅ 관리자 알림 뱃지 카운트
  });

  const [myInfo, setMyInfo] = useState(null);

  // ✅ STOMP notify client ref
  const notifyClientRef = useRef(null);

  // ✅ NEW_MESSAGE 수신 시 Message.jsx inbox 즉시 갱신 트리거
  const [messageRefreshKey, setMessageRefreshKey] = useState(0);

  // ✅ Friends -> Message "쪽지 쓰기 프리셋"
  const [composeTo, setComposeTo] = useState(null);

  //차단 여부 확인
  const isBlockUser = status?.loginUserRole === 'BLOCK';

  //관리자 확인
  const isAdmin = status?.loginUserRole === 'ADMIN';

  // ✅ 최신 tab 추적 (클로저 문제 해결)
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  // ✅ Header(햄버거 점) 동기화 이벤트
  const emitPmUnread = (count) => {
    window.dispatchEvent(new CustomEvent('pm:unread', { detail: { count } }));
  };
  const emitAdminAlert = (count) => {
    window.dispatchEvent(new CustomEvent('admin:alert', { detail: { count } }));
  };
  // ✅ 추가: 친구 알림(친구요청) 점 동기화 이벤트
  const emitFriendAlert = (count) => {
    window.dispatchEvent(
      new CustomEvent('friend:alert', { detail: { count } })
    );
  };

  // ✅ unread-count 동기화 (DB 기준)
  const syncUnread = async () => {
    try {
      const { data } = await api.get('/api/messages/unread-count');
      if (data?.ok) {
        const c = Number(data.count ?? 0);
        setNotify((prev) => ({
          ...prev,
          unreadMessages: c,
        }));
        // ✅ Header 점 갱신
        emitPmUnread(c);
      }
    } catch (e) {
      console.error('[UNREAD] sync error', e);
    }
  };

  // ✅ 새로고침 시에도 친구요청(!) 유지: DB(받은요청 목록) 기준 1회 동기화
  // FriendController: GET /api/friend/requests -> List<FriendRequestDto> OR "needLogin"
  const syncPendingFriends = async () => {
    try {
      const { data } = await api.get('/api/friend/requests');

      // 로그인 안 됨: "needLogin"
      if (typeof data === 'string') {
        setNotify((prev) => ({ ...prev, pendingFriends: 0 }));
        emitFriendAlert(0);
        return;
      }

      const c = Array.isArray(data) ? data.length : 0;
      setNotify((prev) => ({ ...prev, pendingFriends: c }));
      emitFriendAlert(c);
    } catch (e) {
      // 실패해도 무시 (UX 깨짐 방지)
    }
  };

  // ✅ (선택) 관리자 pending count 동기화 (백엔드에 API가 있으면 사용)
  // - 너가 만들 예정이면 여기 살려두고,
  // - 아직 없으면 아래 함수는 호출 안 하면 됨.
  const syncAdminAlerts = async () => {
    try {
      // 예: GET /api/admin/report/pending-count  -> { ok:true, count: number }
      const { data } = await api.get('/api/admin/report/pending-count');
      if (data?.ok) {
        const c = Number(data.count ?? 0);
        setNotify((prev) => ({ ...prev, adminAlerts: c }));
        emitAdminAlert(c);
      }
    } catch (e) {
      // 관리자 전용이라 403/401 나도 무시 가능
      // console.error('[ADMIN] sync error', e);
    }
  };

  // ✅ Friends에서 쪽지 버튼 클릭 시: messages 탭 이동 + 받는 사람 전달
  const openMessageCompose = (toNickName) => {
    setComposeTo(toNickName);
    setTab('messages');
  };

  // 내 정보 조회
  useEffect(() => {
    const fetchMyInfo = async () => {
      try {
        const { data } = await api.get('/api/user/myInfo');
        if (!data.ok) {
          alert(data.message);
          return;
        }
        setMyInfo(data.user);
      } catch (e) {
        console.error(e);
        alert('정보 조회 실패');
      }
    };
    fetchMyInfo();
  }, []);

  // 로그인 상태 조회
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/login/status', {
          credentials: 'include',
        });
        const data = await res.json();
        if (data?.ok) setStatus(data);
      } catch (e) {
        console.error('[LOGIN STATUS] fetch failed', e);
      }
    })();
  }, []);

  // 메뉴 BGM 유지
  useEffect(() => {
    if (!isMenuBgmPlaying()) {
      playMenuBgmRandom();
    }
  }, []);

  // analyser 연결
  useEffect(() => {
    const id = setInterval(() => {
      const a = getMenuAnalyser();
      if (a) {
        analyserRef.current = a;
        clearInterval(id);
      }
    }, 50);

    return () => clearInterval(id);
  }, []);

  // ✅ 첫 진입 시 unread-count 한번 동기화 (+ 친구요청도 DB기준 1회 동기화)
  useEffect(() => {
    syncUnread();
    syncPendingFriends(); // ✅ 새로고침해도 친구 ! 유지
    // 관리자도 “초기 동기화” 하고 싶으면 살려
    // syncAdminAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ STOMP 알림 구독: /user/queue/notify
  useEffect(() => {
    if (!myInfo) return;
    if (notifyClientRef.current) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 3000,
      debug: () => { },

      onConnect: () => {
        console.log('[NOTIFY] STOMP connected');

        client.subscribe('/user/queue/notify', async (frame) => {
          console.log('[NOTIFY] RECEIVED body:', frame.body);

          let payload;
          try {
            payload = JSON.parse(frame.body);
          } catch (e) {
            console.error('[NOTIFY] JSON parse error:', e);
            return;
          }

          // ✅ 관리자 알림(신고 접수 등)
          // payload 예:
          // { type:'ADMIN_NOTIFY', event:'REPORT_NEW', reportId:..., ... }
          if (payload.type === 'ADMIN_NOTIFY' && payload.event === 'REPORT_NEW') {
            // manager 탭이면 굳이 뱃지 올리지 않음(보고 있는 중)
            if (tabRef.current === 'manager') {
              console.log('[NOTIFY] in manager tab -> ignore badge increment');
              return;
            }

            setNotify((prev) => {
              const next = (prev.adminAlerts || 0) + 1;
              // ✅ Header 점 갱신
              emitAdminAlert(next);
              return { ...prev, adminAlerts: next };
            });

            console.log('[NOTIFY] adminAlerts++');
            return;
          }

          // ✅ 친구 요청 알림 (탭 아니면 +1, 탭이면 무시)
          // payload 예:
          // { type:'FRIEND_NOTIFY', event:'REQUEST_NEW', data:{...} }
          if (
            payload.type === 'FRIEND_NOTIFY' &&
            payload.event === 'REQUEST_NEW'
          ) {
            if (tabRef.current === 'friends') {
              console.log('[NOTIFY] in friends tab -> ignore badge increment');
              return;
            }

            setNotify((prev) => {
              const next = (prev.pendingFriends || 0) + 1;
              emitFriendAlert(next);
              return { ...prev, pendingFriends: next };
            });

            console.log('[NOTIFY] pendingFriends++');
            return;
          }

          if (payload.type === 'NEW_MESSAGE') {
            // ✅ messages 탭이면: 증가하지 말고 DB 기준 재동기화 + inbox 즉시 갱신
            if (tabRef.current === 'messages') {
              console.log('[NOTIFY] in messages tab -> sync + refresh inbox');
              await syncUnread();
              setMessageRefreshKey((k) => k + 1);
              return;
            }

            // ✅ messages 탭이 아니면: 즉시 UX (카운트 +1)
            setNotify((prev) => {
              const next = (prev.unreadMessages || 0) + 1;
              // ✅ Header 점 갱신
              emitPmUnread(next);
              return { ...prev, unreadMessages: next };
            });

            console.log('[NOTIFY] unreadMessages++');
          }
        });
      },

      onStompError: (frame) => {
        console.error('[NOTIFY] STOMP error:', frame?.headers, frame?.body);
      },
      onWebSocketError: (e) => {
        console.error('[NOTIFY] WS error:', e);
      },
      onDisconnect: () => {
        console.log('[NOTIFY] STOMP disconnected');
      },
    });

    client.activate();
    notifyClientRef.current = client;

    return () => {
      try {
        client.deactivate();
      } finally {
        notifyClientRef.current = null;
      }
    };
  }, [myInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ messages 탭 들어갈 때도 한번 DB 기준 동기화(추천)
  useEffect(() => {
    if (tab !== 'messages') return;
    syncUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ✅ manager 탭 들어가면 관리자 알림 뱃지 초기화 + Header 점도 끄기
  useEffect(() => {
    if (tab !== 'manager') return;

    setNotify((prev) => ({ ...prev, adminAlerts: 0 }));
    emitAdminAlert(0);

    // manager 화면 진입 시 “DB 기준으로 다시 맞추고 싶으면” 아래 살려
    // syncAdminAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ✅ friends 탭 들어가면 친구요청 알림 뱃지 "꺼지게" 처리 (UX)
  // 단, 새로고침했을 때는 syncPendingFriends()가 다시 켜줌.
  useEffect(() => {
    if (tab !== 'friends') return;

    setNotify((prev) => ({ ...prev, pendingFriends: 0 }));
    emitFriendAlert(0);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!myInfo) return null;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Background
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -3,
        }}
      />

      <Header />

      {/* ===== 메인 콘텐츠 영역 ===== */}
      <main
        style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          padding: '40px 21%',
        }}
      >
        {/* 좌측 메뉴 */}
        <aside
          style={{
            width: '220px',
            borderRadius: '12px',
            background: 'rgba(20,22,28,0.7)',
            padding: '14px',
          }}
        >
          {[
            ['manager', '관리자'],
            ['profile', '프로필'],
            ['games', '내 게임'],
            ['records', '플레이 기록'],
            ['friends', '친구'],
            ['messages', '메시지'],
            ['policy', '약관 / 탈퇴'],
          ].map(([key, label]) => {
            const blockedTabs = ['manager', 'games', 'records', 'friends', 'messages'];
            const isBlockedTab = isBlockUser && blockedTabs.includes(key);

            //관리자 탭은 관리자가 아니라면 렌더링 안 함
            if(key === 'manager' && !isAdmin) return null;

            if(isBlockedTab) return null;

            return (
              <div
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: tab === key ? '#5aeaff' : '#cfd8e3',
                  fontWeight: tab === key ? 600 : 400,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{label}</span>
                  {/* ✅ 관리자/친구/메시지 알림 있으면 느낌표 */}
                  {key === 'manager' && notify.adminAlerts > 0 && <AlertMark />}
                  {key === 'friends' && notify.pendingFriends > 0 && <AlertMark />}
                  {key === 'messages' &&
                    notify.unreadMessages > 0 && <AlertMark />}

                  {/* 차단 유저 느낌표 표시 x */}
                  {!isBlockUser && key === 'manager' && notify.adminAlerts > 0 && (
                    <AlertMark />
                  )}

                  {!isBlockUser && key === 'friends' && notify.pendingFriends > 0 && (
                    <AlertMark />
                  )}

                  {!isBlockUser && key === 'messages' && notify.unreadMessages > 0 && (
                    <AlertMark />
                  )}
                </div>
              </div>
            );
          })}
        </aside>

        {/* 우측 패널 */}
        <section
          style={{
            width: '100%',
            maxWidth: '860px',
            margin: '0 auto',
            borderRadius: '14px',
            background: 'rgba(20,22,28,0.65)',
            padding: '20px',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 64px - 80px)',
          }}
        >
          {tab === 'manager' && isAdmin && <Manager />}
          {tab === 'profile' && (
            <ProfileSection myInfo={myInfo} status={status} />
          )}
          {tab === 'games' && <MyGames />}
          {tab === 'records' && <Records />}

          {/* ✅ Friends에 쪽지 오픈 콜백 전달 */}
          {tab === 'friends' && (
            <Friends user={status} onClickMessage={openMessageCompose} />
          )}

          {/* ✅ Message에 refreshKey + onReadDone + composeTo 전달 */}
          {tab === 'messages' && (
            <Message
              refreshKey={messageRefreshKey}
              onReadDone={syncUnread}
              composeTo={composeTo}
              onConsumeComposeTo={() => setComposeTo(null)}
            />
          )}

          {tab === 'policy' && <Policy />}
        </section>
      </main>

      {/* ===== Visualizer ===== */}
      <Visualizer
        size="game"
        preset="menu"
        analyserRef={analyserRef}
        active={true}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '28vh',
          zIndex: -2,
          pointerEvents: 'none',
        }}
      />

      {/* Blur Overlay */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '100vh',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'rgba(255,255,255,0.03)',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function AlertMark() {
  return (
    <FontAwesomeIcon
      icon={faExclamation}
      style={{ color: '#ff4d4f', fontSize: 20 }}
    />
  );
}
