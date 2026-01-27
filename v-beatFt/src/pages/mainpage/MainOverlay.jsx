// pages/mainpage/MainOverlay.jsx
import { changePasswordApi } from '../../api/auth';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [listMode, setListMode] = useState('PUBLIC'); // PUBLIC | MY
  const loginUserId = auth?.loginUserId ?? null;
  const isBlockUser = auth?.loginUserRole === 'BLOCK';

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
          listMode === 'PUBLIC'
            ? '/api/songs'
            : '/api/songs/my';

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
            uploaderUserId: s.uploaderUserId ?? s.userId ?? s.ownerId ?? null,  //업로드한 유저 Id
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
  }, [songs.length, selectedIndex]);

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
        if (!songs.length) return;

        console.log('선택 확정:', songs[selectedIndex]);
        playMenuConfirm();
        stopPreview();
        navigate(`/game/play?songId=${songs[selectedIndex].id}&diff=${String(songs[selectedIndex].diff).toLowerCase()}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, songs, navigate]);

  useEffect(() => {
    const song = songs[selectedIndex];
    const url = songs[selectedIndex]?.previewUrl;

    if (!url) {
      stopPreview();
      return;
    }

    playPreview(url, { durationSec: 8 });
    //곡 선택 바뀔 때 이전 소리 겹치는 거 방지
    return () => stopPreview();
  }, [selectedIndex, songs]);


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
  }, [selectedSong?.id, selectedSong?.diff]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Header />

      <main
        style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '10%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '48%',
            height: '62%',
            display: 'flex',
            gap: '24px',
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
                    {/* More (profile / report) */}
                    <div style={{ position: 'relative', marginLeft: 'auto' }}>
                      <button
                        style={moreBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreOpen((v) => !v);
                        }}
                      >
                        ⋯
                      </button>

                      {moreOpen && (
                        <div style={moreMenu}>
                          <div
                            style={menuItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoreOpen(false);
                              setProfileOpen(true);
                              // TODO: 제작자 프로필 모달 오픈
                            }}
                          >
                            제작자 프로필
                          </div>
                          <div
                            style={{
                              ...menuItem,
                              color: isMySong ? 'rgba(255,255,255,0.35)' : '#ff6b6b',
                              cursor: isMySong ? 'not-allowed' : 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isMySong) {
                                alert('본인이 업로드한 곡은 신고할 수 없습니다.');
                                setMoreOpen(false);
                                return;
                              }
                              setMoreOpen(false);
                              setReportOpen(true);
                            }}
                          >
                            신고하기
                          </div>
                        </div>
                      )}
                    </div>
                    <UserProfileModal
                      open={profileOpen}
                      user={{
                        id: selectedSong?.id,          // TODO: 추후 제작자 id
                        nickname: selectedSong?.artist // 임시
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
                        console.log('REPORT payload =', payload);
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
            ref={wheelContainerRef}
            style={{
              position: 'relative',
              flex: 1,
              overflow: 'hidden',
              perspective: '900px',
              left: 80
            }}
          >
            {/* 공개곡/my곡 전환 */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {[
                ['PUBLIC', '공개 곡'],
                ['MY', '내 곡'],
              ].map(([v, label]) => {
                const active = listMode === v;
                const disabled = v === 'MY' && isBlockUser;
                return (
                  <div
                    key={v}
                    onClick={() => {
                      if (disabled) {
                        alert('차단된 사용자는 사용할 수 없는 기능입니다.');
                        return;
                      }
                      setListMode(v)
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 13,
                      opacity: disabled ? 0.35 : 1,
                      pointerEvents: disabled ? 'none' : 'auto',
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
            </div>
            {/* 곡 없음 안내 */}
            {!loading && songs.length === 0 && (
              <div
                style={{
                  fontsize: 17,
                  textAlign: 'center',
                  margin: '85px 0',
                  opacity: 0.42,
                }}
              >
                {listMode === 'MY'
                  ? '업로드한 곡이 존재하지 않습니다.'
                  : '등록된 공개 곡이 존재하지 않습니다.'
                }
              </div>
            )}

            {songs.length > 0 && (
              <>

                {/* 난이도 기준선 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '42%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                    pointerEvents: 'none',
                    zIndex: 3,
                  }}
                >
                  {/* 라벨 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 210,
                      top: '-24px',
                      display: 'flex',
                      gap: '12px',
                      fontSize: '18px',
                      color: '#cfd8e3',
                      opacity: 0.7,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        color: '#ffffff',
                      }}
                    >
                      {selectedSong?.diff ?? 'NORMAL'}
                    </span>
                  </div>
                </div>
              </>
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

                // ✅ HEADER
                if (item.type === 'header') {
                  const isCurrent = item.diff === selectedSong?.diff;
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
                        opacity: isCurrent ? 0 : 0.7,
                        pointerEvents: 'none',
                      }}
                    >
                      {!isCurrent && item.diff}
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
          </section>
        </div>
        {/* RIGHT RANK PANEL */}
        <div
          style={{
            position: 'absolute',
            right: '10%',
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
      {showPwChangeModal && (
        <PasswordChangeModal onClose={onClosePwChangeModal} onSubmit={handleChangePw} />
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
