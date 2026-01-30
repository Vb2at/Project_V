// pages/mainpage/MainOverlay.jsx
import { changePasswordApi, statusApi } from '../../api/auth';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, } from 'react-router-dom';
import { playMenuMove, playMenuConfirm, playPreview, stopPreview, playMenuBgmRandom, isMenuBgmPlaying } from '../../components/engine/SFXManager';
import { getMenuAnalyser } from '../../components/engine/SFXManager';
import Header from '../../components/Common/Header';
import RankTable from './RankTable';
import Visualizer from '../../components/visualizer/Visualizer';
import UserProfileModal from "../../components/Common/UserProfileModal";
import UserReportModal from "../../components/Common/UserReportModal";
import PasswordChangeModal from '../../components/Common/PasswordChangeModal';

const formatDuration = (sec) => {
  const n = Number(sec);
  if (!n || n <= 0) return '--:--';
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const ITEM_HEIGHT = 72;
const INPUT_LOCK_MS = 50;

export default function MainOverlay({
  auth,
  showPwChangeModal,
  onClosePwChangeModal,
}) {
  const navigate = useNavigate();
  const wheelLockRef = useRef(false);
  const keyLockRef = useRef(false);
  const wheelContainerRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const analyserRef = useRef(null);
  const [ranking, setRanking] = useState([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [listMode, setListMode] = useState('PUBLIC'); // PUBLIC | MY | LINK | MULTI
  const [shareLink, setShareLink] = useState('');
  const [loginUserId, setLoginUserId] = useState(null);
  const [isBlockUser, setIsBlockUser] = useState(false);
  const [multiRooms, setMultiRooms] = useState([]);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [selectedMultiSongId, setSelectedMultiSongId] = useState(null);
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    const flag = sessionStorage.getItem('roomClosed');
    if (flag === '1') {
      sessionStorage.removeItem('roomClosed');
      alert('방이 종료되었습니다.');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await statusApi();
        if (!alive) return;

        if (res.data?.ok) {
          setLoginUserId(Number(res.data.loginUserId));
          setIsBlockUser(res.data.loginUserRole === 'BLOCK');
        } else {
          setLoginUserId(null);
          setIsBlockUser(false);
        }
      } catch (e) {
        if (!alive) return;
        setLoginUserId(null);
      } finally {
        if (alive) setStatusLoaded(true);
      }
    })();

    return () => { alive = false; };
  }, []);

  const fetchMultiRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/multi/rooms', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`방 목록 요청 실패 (${res.status})`);

      const data = await res.json();
      setMultiRooms(Array.isArray(data.rooms) ? data.rooms : []);
    } catch (e) {
      console.error(e);
      setMultiRooms([]);
    }
  }, []);

  useEffect(() => {
    if (listMode === 'MULTI') {
      fetchMultiRooms();
    }
  }, [listMode, fetchMultiRooms]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await statusApi();

        if (!alive) return;

        if (res.data?.ok) {
          setLoginUserId(Number(res.data.loginUserId));
          setIsBlockUser(res.data.loginUserRole === 'BLOCK');
        } else {
          setLoginUserId(null);
          setIsBlockUser(false);
        }
      } catch (e) {
        if (!alive) return;
        setLoginUserId(null);
      }
    })();

    return () => { alive = false; };
  }, []);


  useEffect(() => {
    const unlocked = localStorage.getItem('bgmUnlocked') === 'true';

    if (unlocked && !isMenuBgmPlaying()) {
      playMenuBgmRandom();
    }
  }, []);

  useEffect(() => {
    // singleBgm이 이미 (Start/Login 클릭에서) 실행된 상태라면
    // analyserNode가 여기서 잡힙니다.
    const id = setInterval(() => {
      const a = getMenuAnalyser();
      if (a) {
        analyserRef.current = a;
        clearInterval(id);
      }
    }, 50);

    return () => clearInterval(id);
  }, []);


  //loading / errorMsg 상태 (지금 코드에서 setLoading/setErrorMsg 쓰고 있어서 필수)
  const [loading, setLoading] = useState(true);
  const [_errorMsg, setErrorMsg] = useState('');

  //서버에서 받아온 공개곡을 여기에 덮어씀
  const [songs, setSongs] = useState([]);

  //공개곡 목록: GET /api/songs
  useEffect(() => {
    let mounted = true;

    const loadSongs = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        const url =
          listMode === 'MY'
            ? '/api/songs/my'
            : '/api/songs'; // MULTI 포함 PUBLIC 사용
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });

        if (!res.ok) throw new Error(`곡 목록 요청 실패 (${res.status})`);

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        const mapped = list.map((s) => {
          const len = s.length ?? s.duration ?? s.lengthSec;

          return {
            id: s.id,
            title: (s.title ?? '(no title)').replace(/\.mp3$/i, ''),
            artist: s.artist ?? 'unknown',
            cover: s.coverPath ? `/api/songs/${s.id}/cover` : null,
            previewUrl: `/api/songs/${s.id}/preview`,
            lengthSec: Number.isFinite(Number(len)) ? Number(len) : null,
            diff: (s.diff ? String(s.diff).toUpperCase() : 'NORMAL'),
            uploaderUserId: s.uploaderUserId != null
              ? Number(s.uploaderUserId)
              : s.userId != null
                ? Number(s.userId)
                : s.ownerId != null
                  ? Number(s.ownerId)
                  : null,
            nickname: s.nickname ?? 'unknown',
            profileImg: s.profileImg ? encodeURI(s.profileImg) : null,

          };
        });

        if (!mounted) return;
        const DIFF_SORT = { EASY: 1, NORMAL: 2, HARD: 3, HELL: 4 };
        mapped.sort((a, b) =>
          (DIFF_SORT[a.diff] ?? 99) - (DIFF_SORT[b.diff] ?? 99)
        );
        setSongs(mapped);
        setSelectedIndex(0);

      } catch (err) {
        if (!mounted) return;
        setErrorMsg(err?.message ?? '곡 목록 불러오기 실패');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSongs();
    return () => { mounted = false; };
  }, [listMode]);   // ⭐ listMode 의존성 반드시 추가

  // songs 길이가 바뀌면 selectedIndex 범위 보정
  useEffect(() => {
    if (!songs.length) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((prev) => Math.max(0, Math.min(songs.length - 1, prev)));
  }, [songs.length]);

  /* ===============================
     Wheel: 한 번에 한 칸
  =============================== */
  const handleWheel = useCallback((e) => {
    if (listMode === 'MULTI' || listMode === 'LINK') return;
    e.preventDefault();
    if (wheelLockRef.current) return;
    if (!songs.length) return;

    const dir = Math.sign(e.deltaY);
    if (dir === 0) return;

    const nextIndex = Math.max(0, Math.min(songs.length - 1, selectedIndex + dir));
    if (nextIndex === selectedIndex) return;

    wheelLockRef.current = true;
    setSelectedIndex(nextIndex);
    playMenuMove();
    setTimeout(() => {
      wheelLockRef.current = false;
    }, INPUT_LOCK_MS);
  }, [songs.length, selectedIndex, listMode]);

  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      handleWheel(e);
    };

    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [handleWheel]);

  /* ===============================
     Keyboard: 전역 ↑ ↓ / Enter
  =============================== */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (listMode === 'MULTI' || listMode === 'LINK') return;
      if (keyLockRef.current) return;

      // ↑ ↓ 이동
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!songs.length) return;

        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(songs.length - 1, selectedIndex + dir));
        if (nextIndex === selectedIndex) return;

        keyLockRef.current = true;
        setSelectedIndex(nextIndex);
        playMenuMove();
        setTimeout(() => {
          keyLockRef.current = false;
        }, INPUT_LOCK_MS);
      }

      // Enter 확정
      if (e.key === 'Enter') {
        e.preventDefault();
        const s = songs[selectedIndex];
        if (!s?.id) return;

        playMenuConfirm();
        stopPreview();
        navigate(`/game/play?songId=${s.id}&diff=${String(s.diff).toLowerCase()}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, songs, navigate, listMode]);

  useEffect(() => {
    if (listMode === 'MULTI' || listMode === 'LINK') {
      stopPreview();
      return;
    }
    if (!songs || songs.length === 0) {
      stopPreview();
      return;
    }

    const song = songs[selectedIndex];
    if (!song?.id || !song.previewUrl) {
      stopPreview();
      return;
    }

    const url = song.previewUrl;
    playPreview(url, { durationSec: 8 });

    return () => stopPreview();
  }, [selectedIndex, songs, listMode]);


  const DIFF_ORDER = ['EASY', 'NORMAL', 'HARD', 'HELL'];

  const renderList = [];

  DIFF_ORDER.forEach((diff) => {
    const group = songs.filter((s) => (s.diff ?? 'NORMAL') === diff);
    if (!group.length) return;

    // 난이도 헤더 아이템
    renderList.push({
      id: `__HEADER__${diff}`,
      type: 'header',
      diff,
    });

    // 실제 곡들
    group.forEach((song) => {
      renderList.push({
        ...song,
        type: 'song',
        songIndex: songs.findIndex((x) => x.id === song.id),
      });
    });
  });

  const renderSelectedIndex = (() => {
    const id = songs[selectedIndex]?.id;
    if (!id) return 0;
    return renderList.findIndex((item) => item.id === id);
  })();
  const selectedSong = songs[selectedIndex];
  const isLoggedIn = !!auth?.user || loginUserId != null;
  const linkActive = listMode === 'LINK';
  const multiActive = listMode === 'MULTI';
  const isMySong =
    loginUserId != null &&
    selectedSong?.uploaderUserId != null &&
    Number(loginUserId) === Number(selectedSong.uploaderUserId);

  //백엔드 reasonCode에 맞추기 (기존 프론트 mainReason, subReason 나눠져 있었음)
  const makeReasonCode = (p) => {
    const main = String(p?.mainReason ?? '').trim();
    const sub = String(p?.subReason ?? '').trim();

    return `${main}:${sub}`;
  };

  //노래 신고
  const submitSongReport = async (payload) => {
    const body = {
      targetType: 'SONG',
      targetId: Number(selectedSong?.id),
      reasonCode: makeReasonCode(payload),
      description: String(payload?.description ?? ''),
    };

    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    //먼저 JSON 파싱 시도 (실패하면 null)
    const data = await res.json().catch(() => null);

    //401
    if (res.status === 401) {
      throw new Error(data?.message || '로그인이 필요한 기능입니다.');
    }

    //409
    if (res.status === 409) {
      if (data?.code === 'ALREADY_REPORTED') {
        throw new Error('이미 접수된 신고입니다.');
      }
      throw new Error(data?.message || '이미 접수된 신고입니다.');
    }

    if (!res.ok) {
      throw new Error(data?.message || `신고 실패 (${res.status})`);
    }

    // ok:false 방어
    if (data?.ok === false) {
      throw new Error(data?.message ?? '신고 실패');
    }

    return data;
  };

  const handleChangePw = async (currentPw, newPw) => {
    try {
      const res = await changePasswordApi(currentPw, newPw);

      if (res.data?.ok) {
        alert(res.data.message || '비밀번호가 변경되었습니다.');
        //모달 닫기
        onClosePwChangeModal();
      } else {
        alert(res.data?.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || '비밀번호 변경 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (!isLoggedIn && listMode !== 'PUBLIC') {
      setListMode('PUBLIC');
    }
  }, [isLoggedIn, listMode]);

  useEffect(() => {
    const s = selectedSong;

    if (!s?.id || !s?.diff) {
      setRanking([]);
      return;
    }

    let alive = true;


    const loadRanking = async () => {
      try {
        setRankLoading(true);

        const diffParam = String(s.diff).toLowerCase();

        const res = await fetch(`/api/ranking/${s.id}/${diffParam}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });

        if (!res.ok) throw new Error(`랭킹 요청 실패 (${res.status})`);

        const data = await res.json();
        if (!alive) return;

        setRanking(Array.isArray(data.ranking) ? data.ranking
          : []);
      } catch (e) {
        if (!alive) return;
        setRanking([]);
      } finally {
        if (!alive) return;
        setRankLoading(false);
      }
    };

    loadRanking();

    return () => {
      alive = false;
    };
  }, [selectedSong?.id, selectedSong?.diff, selectedSong]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Header />

      <main
        style={{
          position: 'absolute',
          top: 64,
          left: 20,
          right: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '5%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '57%',
            height: '62%',
            display: 'flex',
          }}
        >
          {/* Album + Detail Column */}
          <div
            style={{
              width: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              flexShrink: 0,
              marginLeft: '40px',

            }}
          >
            {/* Album Cover */}
            <div
              style={{
                aspectRatio: '1 / 1',
                borderRadius: '12px',
                background: selectedSong?.cover
                  ? `url(${selectedSong.cover}) center / cover no-repeat`
                  : 'linear-gradient(135deg, #2a2f3a, #1c2028)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9aa6b2',
                fontSize: '12px',
              }}
            >
              {!selectedSong?.cover && (loading ? 'LOADING...' : 'ALBUM')}
            </div>

            {/* Detail Area (하단) */}
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(20,22,28,0.65)',
                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {selectedSong ? (
                <>
                  {/* Title */}
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#ffffff',
                    }}
                  >
                    {selectedSong.title}
                  </div>

                  {/* Artist */}
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#9aa6b2',
                    }}
                  >
                    {selectedSong.artist}
                  </div>

                  {/* Divider */}
                  <div
                    style={{
                      height: '1px',
                      background: 'rgba(255,255,255,0.1)',
                      margin: '4px 0',
                    }}
                  />

                  {/* Meta Inline Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '12px',
                      color: '#9aa6b2',
                      flexWrap: 'wrap',
                    }}
                  >

                    {/* Length */}
                    <span>
                      <strong style={{ color: '#cfd8e3' }}>LENGTH</strong> {' '}
                      {formatDuration(selectedSong.lengthSec)}
                    </span>

                    <span style={{ opacity: 0.4 }}>•</span>

                    {/* Difficulty */}
                    <span style={{ display: 'flex', gap: '6px' }}>
                      {['EASY', 'NORMAL', 'HARD', 'HELL'].map((d) => {
                        const currentDiff = String(selectedSong?.difficulty ?? selectedSong?.diff ?? 'NORMAL').toUpperCase();
                        const active = d === currentDiff;


                        return (
                          <span
                            key={d}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.08)',
                              fontSize: '11px',
                              opacity: active ? 1 : 0.4,
                              fontWeight: active ? 600 : 400,
                            }}
                          >
                            {d}
                          </span>
                        );
                      })}
                    </span>

                    {listMode === 'PUBLIC' && (
                      <div style={{ position: 'relative', marginLeft: 'auto' }}>
                        <button
                          style={{
                            ...moreBtn,
                            cursor: !loginUserId || isBlockUser || isMySong ? 'not-allowed' : 'pointer',
                            opacity: !loginUserId || isBlockUser || isMySong ? 0.35 : 1,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!loginUserId || isBlockUser || isMySong) {
                              if (!loginUserId || isBlockUser) {
                                alert('이용이 제한된 기능입니다.');
                              }
                              return;
                            }
                            setMoreOpen((v) => !v);
                          }}
                        >
                          ⋯
                        </button>

                        {moreOpen && !isMySong && ( // 내 곡이면 메뉴 자체 렌더링 안 함
                          <div style={moreMenu}>
                            {/* 제작자 프로필 */}
                            <div
                              style={{
                                ...menuItem,
                                color: '#cfd8e3',
                                cursor: 'pointer',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoreOpen(false);
                                setProfileOpen(true);
                              }}
                            >
                              제작자 프로필
                            </div>

                            {/* 신고하기 */}
                            <div
                              style={{
                                ...menuItem,
                                color: '#ff6b6b',
                                cursor: 'pointer',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoreOpen(false);
                                setReportOpen(true);
                              }}
                            >
                              신고하기
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <UserProfileModal
                      open={profileOpen}
                      user={{
                        id: selectedSong?.uploaderUserId,          //추후 제작자 id
                        nickname: selectedSong?.nickname, //제작자 닉네임
                        profileImg: selectedSong?.profileImg ?? null,
                      }}
                      onClose={() => setProfileOpen(false)}
                    />

                    <UserReportModal
                      open={reportOpen}
                      type="CONTENT"
                      targetId={selectedSong?.id}
                      targetName={selectedSong?.title}
                      onClose={() => setReportOpen(false)}
                      onSubmit={async (payload) => {
                        try {
                          const desc = String(payload?.description ?? '').trim();

                          await submitSongReport(payload);
                          setReportOpen(false);
                          alert('신고가 정상적으로 접수되었습니다.');
                        } catch (e) {
                          alert(e?.message ?? '신고 처리 중 오류가 발생했습니다.');
                        }
                      }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.6 }}>곡을 선택해주세요</div>
              )}
            </div>
          </div>

          {/* Game List */}

          <section
            ref={(listMode === 'PUBLIC' || listMode === 'MY') ? wheelContainerRef : null}
            style={{
              position: 'relative',
              flex: 1,
              overflow: 'hidden',
              perspective: '900px',
              left: 80,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ================= 상단 버튼 영역 ================= */}
            <div
              style={{
                display: 'flex',
                gap: 15,
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                paddingBottom: 10,
                marginLeft: 'auto',
                zIndex: 5,
                position: 'relative',
              }}
            >
              {[
                ['PUBLIC', '공개 곡'],
                ...(isLoggedIn ? [['MY', '내 곡']] : []),
              ].map(([v, label]) => {
                const active = listMode === v;
                const disabled = v === 'MY' && isBlockUser;
                return (
                  <div
                    key={v}
                    onClick={() => {
                      if (disabled) {
                        alert('이용이 제한된 기능입니다.');
                        return;
                      }
                      setListMode(v);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 13,
                      opacity: disabled ? 0.35 : 1,
                      color: active ? '#0ff' : '#cfd8e3',
                      border: active
                        ? '2px solid rgba(90,234,255,0.9)'
                        : '2px solid rgba(90,234,255,0.3)',
                      background: active
                        ? 'linear-gradient(180deg, rgba(90,234,255,0.25), rgba(10,20,30,0.9))'
                        : 'linear-gradient(180deg, #0e141b, #0a0f15)',
                    }}
                  >
                    {label}
                  </div>
                );
              })}

              {/* 링크 입장 버튼 */}
              {statusLoaded && (
                <div
                  onClick={() => {
                    if (!isLoggedIn || isBlockUser) {
                      alert('이용이 제한된 기능입니다.');
                      return;
                    }
                    stopPreview();
                    setListMode('LINK');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 12,
                    cursor: !isLoggedIn || isBlockUser ? 'not-allowed' : 'pointer',
                    opacity: !isLoggedIn || isBlockUser ? 0.35 : 1,
                    fontSize: 13,
                    color: linkActive ? '#0ff' : '#cfd8e3',
                    border: linkActive
                      ? '2px solid rgba(90,234,255,0.9)'
                      : '2px solid rgba(90,234,255,0.3)',
                    background: linkActive
                      ? 'linear-gradient(180deg, rgba(90,234,255,0.25), rgba(10,20,30,0.9))'
                      : 'linear-gradient(180deg, #0e141b, #0a0f15)',
                  }}
                >
                  링크 입장
                </div>
              )}
              {/* ✅ 멀티 플레이 버튼 (여기로 이동) */}
              {statusLoaded && (
                <div
                  onClick={() => {
                    if (!isLoggedIn || isBlockUser) {
                      alert('이용이 제한된 기능입니다.');
                      return;
                    }
                    stopPreview();
                    setListMode('MULTI');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 12,
                    cursor: !isLoggedIn || isBlockUser ? 'not-allowed' : 'pointer',
                    opacity: !isLoggedIn || isBlockUser ? 0.35 : 1,
                    fontSize: 13,
                    color: multiActive ? '#0ff' : '#cfd8e3',
                    border: multiActive
                      ? '2px solid rgba(90,234,255,0.9)'
                      : '2px solid rgba(90,234,255,0.3)',
                    background: multiActive
                      ? 'linear-gradient(180deg, rgba(90,234,255,0.25), rgba(10,20,30,0.9))'
                      : 'linear-gradient(180deg, #0e141b, #0a0f15)',
                  }}
                >
                  멀티 플레이
                </div>
              )}
            </div>

            {/* ================= 메인 영역 ================= */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                overflow: 'hidden',
              }}
            >
              {/* ===== 멀티 컨트롤 바 ===== */}
              {listMode === 'MULTI' && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.25)',
                    display: 'flex',
                    gap: 8,
                    flexShrink: 0,

                  }}
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={multiBtn}>공개방</button>
                    <button style={multiBtn}>비공개 입장</button>
                    <button style={multiBtn} onClick={fetchMultiRooms}>
                      새로고침
                    </button>

                    <div style={{ marginLeft: 'auto' }}>
                      <button
                        style={multiBtnPrimary}
                        onClick={() => {
                          setSelectedMultiSongId(null);
                          setCreateRoomOpen(true);
                        }}
                      >
                        방 만들기
                      </button>                    </div>
                  </div>
                </div>
              )}

              {/* ===== 링크 입장 화면 ===== */}
              {listMode === 'LINK' && (
                <div
                  style={{
                    height: '70%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 420,
                      padding: 24,
                      borderRadius: 14,
                      background: 'rgba(10,20,30,0.85)',
                      border: '2px solid rgba(90,234,255,0.45)',
                      boxShadow: '0 0 20px rgba(90,234,255,0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    <h3 style={{ color: '#5aeaff', textAlign: 'center' }}>
                      공유 링크로 입장
                    </h3>

                    <input
                      value={shareLink}
                      onChange={(e) => setShareLink(e.target.value)}
                      placeholder="공유 링크를 붙여넣으세요"
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: '#0b1118',
                        border: '1px solid rgba(90,234,255,0.4)',
                        color: '#e6f7ff',
                        fontSize: 14,
                      }}
                    />

                    <button
                      onClick={async () => {
                        try {
                          let token = shareLink.trim();
                          if (!token) {
                            alert('토큰을 입력해주세요.');
                            return;
                          }

                          // 전체 URL이면 파싱
                          let path = '/game/play';
                          try {
                            const url = new URL(shareLink);
                            path = url.pathname;
                            token = url.searchParams.get('token') || token;
                          } catch { }

                          // ✅ 토큰 유효성 검증
                          const res = await fetch(`/api/songs/by-token/${token}`, {
                            method: 'GET',
                            headers: { Accept: 'application/json' },
                            credentials: 'include',
                          });

                          if (!res.ok) {
                            if (res.status === 404) {
                              alert('존재하지 않는 토큰입니다.');
                            } else {
                              alert(`토큰 검증 중 오류 발생 (${res.status})`);
                            }
                            return;
                          }

                          const data = await res.json();
                          if (!data?.id) {
                            alert('존재하지 않는 토큰입니다.');
                            return;
                          }

                          // 유효하면 이동
                          navigate(`${path}?token=${token}`);
                        } catch (e) {
                          console.error(e);
                          alert('입장 중 오류가 발생했습니다.');
                        }
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: 8,
                        border: '1px solid rgba(90,234,255,0.6)',
                        background: 'rgba(90,234,255,0.15)',
                        color: '#5aeaff',
                        cursor: 'pointer',
                      }}
                    >
                      입장
                    </button>
                  </div>
                </div>
              )}

              {/* ===== 기존 리스트 화면 ===== */}
              {(listMode === 'PUBLIC' || listMode === 'MY') && (
                <>
                  {!loading && songs.length === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        transform: 'translateY(-50%)',
                        textAlign: 'center',
                        fontSize: 16,
                        opacity: 0.45,
                      }}
                    >
                      {listMode === 'MY'
                        ? '업로드한 곡이 존재하지 않습니다.'
                        : '등록된 공개 곡이 존재하지 않습니다.'}
                    </div>
                  )}
                  {/* 난이도 기준선 + 고정 난이도 텍스트 */}
                  {songs.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '42%',
                        height: 0,
                        pointerEvents: 'none',
                        zIndex: 3,
                      }}
                    >
                      {/* 기준선 */}
                      <div
                        style={{
                          height: '1px',
                          background:
                            'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                        }}
                      />

                      {/* 난이도 텍스트 (선 바로 위 중앙) */}
                      <div
                        style={{
                          position: 'absolute',
                          top: -25,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: 16,
                          fontWeight: 700,
                          letterSpacing: '0.14em',
                          color: '#cfd8e3',
                          opacity: 0.85,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {selectedSong?.diff}
                      </div>
                    </div>
                  )}

                  {/* 고정 포커스 라인 */}
                  {songs.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '50%',
                        height: ITEM_HEIGHT,
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        zIndex: 2,
                      }}
                    />
                  )}

                  {/* 리스트 트랙 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      transform: `translateY(calc(-${renderSelectedIndex * ITEM_HEIGHT}px - ${ITEM_HEIGHT / 2}px))`,
                      transition: 'transform 0.25s ease-out',
                    }}
                  >
                    {renderList.map((item, index) => {
                      const d = index - renderSelectedIndex;
                      const a = Math.abs(d);

                      const scale = Math.max(0.8, 1 - a * 0.12);
                      const z = -a * 60;
                      const y = d * 10;
                      const opacity = Math.max(0.35, 1 - a * 0.25);

                      if (item.type === 'header') {
                        const dist = Math.abs(index - renderSelectedIndex);
                        const hide = dist <= 1;

                        return (
                          <div
                            key={item.id}
                            style={{
                              height: ITEM_HEIGHT,
                              paddingLeft: 12,
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: 15,
                              fontWeight: 700,
                              letterSpacing: '0.12em',
                              color: '#cfd8e3',
                              opacity: hide ? 0 : 0.7,
                              pointerEvents: 'none',
                            }}
                          >
                            {!hide && item.diff}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedIndex(item.songIndex);
                            playMenuConfirm();
                            stopPreview();
                            navigate(`/game/play?songId=${item.id}&diff=${String(item.diff ?? 'NORMAL').toLowerCase()}`);
                          }}
                          style={{
                            height: ITEM_HEIGHT,
                            boxSizing: 'border-box',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            transform: `translateY(${y}px) translateZ(${z}px) scale(${scale})`,
                            opacity,
                            transition: 'transform 0.2s, opacity 0.2s',
                            cursor: 'pointer',
                            background:
                              item.songIndex === selectedIndex
                                ? 'rgba(255,255,255,0.08)'
                                : 'transparent',
                          }}
                        >
                          <div
                            style={{
                              fontSize: item.songIndex === selectedIndex ? '25px' : '18px',
                              color: item.songIndex === selectedIndex ? '#ffffff' : '#b8c4d6',
                              fontWeight: item.songIndex === selectedIndex ? 600 : 400,
                            }}
                          >
                            {item.title}
                          </div>
                          <div
                            style={{
                              fontSize: '14px',
                              color: item.songIndex === selectedIndex ? '#cfd8e3' : '#7f8fa6',
                            }}
                          >
                            {item.artist}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}


              {/* ===== 멀티 방 리스트 화면 ===== */}
              {listMode === 'MULTI' && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.25)',
                    flex: 1,
                  }}
                >
                  {multiRooms.length === 0 && (
                    <div style={{ textAlign: 'center', opacity: 0.5, padding: 20 }}>
                      생성된 방이 없습니다.
                    </div>
                  )}

                  {multiRooms.map((r) => (
                    <div
                      key={r.roomId ?? r.id}
                      onClick={async () => {
                        playMenuConfirm();
                        const roomId = r.roomId ?? r.id;
                        navigate(`/multi/room/${roomId}`);
                        try {
                          const roomId = r.roomId ?? r.id;

                          navigate(`/multi/room/${roomId}`);
                        } catch (e) {
                          alert(e.message || '방 입장 중 오류 발생');
                        }
                      }}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.15)',
                        marginBottom: 10,
                        cursor: 'pointer',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      {/* 상단: 방 이름 + 잠금 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          {r.roomName}
                        </div>
                        {r.isPrivate && <span style={{ fontSize: 13, opacity: 0.7 }}>🔒</span>}
                      </div>

                      {/* 곡 정보 */}
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        🎵 {r.songTitle}
                      </div>

                      {/* 하단: 인원 */}
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, opacity: 0.75 }}>
                        <span>{(r.players?.length ?? 0)} / {r.maxPlayers} 명</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}


            </div>
          </section>

        </div>
        {/* RIGHT RANK PANEL */}
        {isLoggedIn && (
          <div
            style={{
              position: 'absolute',
              right: '8%',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '22%',
              height: '70%',
              borderRadius: '14px',
              background: 'rgba(120,0,0,0.35)',
              boxShadow: '0 0 0 2px rgba(255,80,80,0.6), 0 20px 40px rgba(0,0,0,0.45)',
              padding: '12px',
            }}
          >
            <RankTable
              ranking={ranking}
              loading={rankLoading}
            />
          </div>
        )}

      </main >
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
      {/* Soft Blur Overlay */}
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
      {/* 비밀번호 변경 모달 */}
      {
        showPwChangeModal && (
          <PasswordChangeModal onClose={onClosePwChangeModal} onSubmit={handleChangePw} />
        )
      }
      {createRoomOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => {
            setCreateRoomOpen(false);
            setRoomName('');
            setIsPrivateRoom(false);
            setRoomPassword('');
            setSelectedMultiSongId(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 420,
              padding: 20,
              borderRadius: 14,
              background: 'rgba(10,20,30,0.95)',
              border: '2px solid rgba(90,234,255,0.6)',
              boxShadow: '0 0 24px rgba(90,234,255,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h3 style={{ color: '#5aeaff', textAlign: 'center' }}>방 만들기</h3>

            {/* 방 이름 */}
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="방 이름"
              style={modalInput}
            />

            {/* 곡 선택 (우선 현재 선택 곡 고정) */}
            <div style={{ fontSize: 13, marginBottom: 6, color: '#5aeaff' }}>
              🎵 곡 선택 (PUBLIC)
            </div>

            <div
              style={{
                maxHeight: 160,
                overflowY: 'auto',
                border: '1px solid rgba(90,234,255,0.4)',
                borderRadius: 8,
              }}
            >
              {songs.map((s) => {
                const active = selectedMultiSongId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedMultiSongId(s.id)}
                    style={{
                      padding: '6px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                      background: active ? 'rgba(90,234,255,0.25)' : 'transparent',
                    }}
                  >
                    {s.title}
                  </div>
                );
              })}
            </div>


            <label style={{ display: 'flex', gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={isPrivateRoom}
                onChange={(e) => setIsPrivateRoom(e.target.checked)}
              />
              비공개 방
            </label>

            {/* 비밀번호 */}
            {isPrivateRoom && (
              <input
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="비밀번호"
                type="password"
                style={modalInput}
              />
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                style={multiBtn}
                onClick={() => setCreateRoomOpen(false)}
              >
                취소
              </button>

              <button
                style={multiBtnPrimary}
                onClick={async () => {
                  if (!roomName.trim()) {
                    alert('방 이름을 입력해 주세요.');
                    return;
                  }
                  if (!selectedMultiSongId) {
                    alert('곡을 선택해 주세요.');
                    return;
                  }
                  if (isPrivateRoom && !roomPassword.trim()) {
                    alert('비공개 방 비밀번호를 입력해 주세요.');
                    return;
                  }

                  const payload = {
                    roomName: roomName.trim(),
                    songId: selectedMultiSongId,
                    isPrivate: isPrivateRoom,
                    password: isPrivateRoom ? roomPassword : null,
                  };

                  try {
                    const res = await fetch('/api/multi/rooms', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify(payload),
                    });

                    if (!res.ok) throw new Error(`방 생성 실패 (${res.status})`);

                    const data = await res.json();

                    if (!data.roomId) {
                      throw new Error('방 ID를 받지 못했습니다.');
                    }

                    // 초기화
                    setCreateRoomOpen(false);
                    setRoomName('');
                    setIsPrivateRoom(false);
                    setRoomPassword('');
                    setSelectedMultiSongId(null);

                    // ✅ 바로 로비 이동
                    navigate(`/multi/room/${data.roomId}`);

                  } catch (e) {
                    console.error(e);
                    alert(e?.message || '방 생성 중 오류가 발생했습니다.');
                  }
                }}
              >
                생성
              </button>

            </div>
          </div>
        </div>
      )}

    </div >
  );
}
const moreBtn = {
  height: 22,
  padding: '0 8px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: '#aaa',
  cursor: 'pointer',
};

const moreMenu = {
  position: 'absolute',
  right: 0,
  top: '100%',
  marginTop: 6,
  background: '#0b0b0b',
  border: '1px solid #333',
  borderRadius: 8,
  overflow: 'hidden',
  zIndex: 20,
};

const menuItem = {
  padding: '8px 14px',
  fontSize: 13,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
const multiBtn = {
  padding: '6px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(90,234,255,0.35)',
  color: '#cfd8e3',
  fontSize: 12,
  cursor: 'pointer',
};

const multiBtnPrimary = {
  ...multiBtn,
  background: 'rgba(90,234,255,0.18)',
  border: '1px solid rgba(90,234,255,0.8)',
  color: '#5aeaff',
  fontWeight: 600,
};
const modalInput = {
  padding: '10px 12px',
  borderRadius: 8,
  background: '#0b1118',
  border: '1px solid rgba(90,234,255,0.4)',
  color: '#e6f7ff',
  fontSize: 14,
};
