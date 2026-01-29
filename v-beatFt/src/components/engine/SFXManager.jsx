const BASE_VOLUME = {
  normal: 1.0,
  accent: 1.0,
};


function getUserSettings() {
  try {
    const v = localStorage.getItem('userSettings');
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

function playOnce(src, volume = 1.0) {
  const settings = getUserSettings();
  if (settings && settings.hitSound === false) return;
  const audio = new Audio(src);
  const sfxVol = settings ? settings.sfxVolume / 100 : 1;
  audio.volume = volume * sfxVol;
  audio.play().catch(() => { });
}

// =========================
// HIT SFX
// =========================

// 일반 레인
export function playTapNormal(volume = 1.0) {
  playOnce('/sound/hit/hit_tap.wav', BASE_VOLUME.normal * volume);
}

// 강조 레인
export function playTapAccent(volume = 1.0) {
  playOnce('/sound/hit/hit_tap_accent.wav', BASE_VOLUME.accent * volume);
}

// =========================
// MENU BGM
// =========================

const MENU_BGM_LIST = [
  '/sound/bgm/menu1.mp3',
  '/sound/bgm/menu2.mp3',
  '/sound/bgm/menu3.mp3',
  '/sound/bgm/menu4.mp3',
  '/sound/bgm/menu5.mp3',
  '/sound/bgm/menu6.mp3',
  '/sound/bgm/menu7.mp3',
];

let menuBgmAudio = null;
let menuBgmPlaying = false;
let menuBgmUserPaused = false;
let lastMenuBgmIndex = -1;
let menuBgmBaseVolume = 0.4;

// Web Audio 관련 변수
let audioCtx = null;
let analyserNode = null;
let sourceNode = null;
let destConnected = false;

// ✅ [추가] 오디오 노드 연결을 처리하는 내부 공통 함수
function _connectMenuAudioGraph(audioElement) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => { });
  }

  // 기존 소스 노드 연결 해제
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch {/* ignore */ }
  }

  // 새로운 소스 생성 및 분석기 연결
  sourceNode = audioCtx.createMediaElementSource(audioElement);

  if (!analyserNode) {
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;
  }

  sourceNode.connect(analyserNode);

  if (!destConnected) {
    analyserNode.connect(audioCtx.destination);
    destConnected = true;
  }
}

export function muteMenuBgm() {
  if (!menuBgmAudio) return;
  menuBgmAudio.volume = 0;
}

export function restoreMenuBgmVolume() {
  if (!menuBgmAudio) return;
  menuBgmAudio.volume = menuBgmBaseVolume;
}

export function playMenuBgmRandom() {
  stopMenuBgm();

  menuBgmUserPaused = false;

  let idx = Math.floor(Math.random() * MENU_BGM_LIST.length);
  if (MENU_BGM_LIST.length > 1) {
    while (idx === lastMenuBgmIndex) {
      idx = Math.floor(Math.random() * MENU_BGM_LIST.length);
    }
  }
  lastMenuBgmIndex = idx;

  menuBgmAudio = new Audio(MENU_BGM_LIST[idx]);
  menuBgmAudio.crossOrigin = 'anonymous'; // ✅ CORS 문제 해결 (비주얼라이저 데이터 획득용)
  menuBgmAudio.loop = false;

  const settings = getUserSettings();
  const bgmVol = settings ? settings.bgmVolume / 100 : 1;

  menuBgmBaseVolume = 0.4 * bgmVol;
  menuBgmAudio.volume = menuBgmBaseVolume;

  // ✅ [수정] Web Audio 그래프 연결 로직 추가
  _connectMenuAudioGraph(menuBgmAudio);

  menuBgmAudio.play().catch(() => { });

  // ✅ 곡 종료 시 다음 곡 자동 재생
  menuBgmAudio.onended = () => {
    if (menuBgmUserPaused) return;
    playMenuBgmRandom();
  };

  menuBgmPlaying = true;
}

export function toggleMenuBgm() {
  if (!menuBgmAudio) return;

  if (menuBgmPlaying) {
    menuBgmAudio.pause();
    menuBgmPlaying = false;
    menuBgmUserPaused = true;
  } else {
    // 재생 재개 시 AudioContext 상태 확인
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    menuBgmAudio.play().catch(() => { });
    menuBgmPlaying = true;
    menuBgmUserPaused = false;
  }
}

export function stopMenuBgm() {
  if (!menuBgmAudio) return;

  menuBgmAudio.pause();
  menuBgmAudio.currentTime = 0;
  menuBgmAudio = null;
  menuBgmPlaying = false;
  menuBgmUserPaused = false;

  // ✅ analyser 연결 정리
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch {/* ignore */ }
    sourceNode = null;
  }
}

// ✅ 실제 재생 상태 조회용
export function isMenuBgmPlaying() {
  return menuBgmPlaying;
}

// =========================
// MENU UI SFX
// =========================

export function playMenuMove() {
  playOnce('/sound/ui/menu_move.wav', 0.5);
}
// === MENU CONFIRM ===
export function playMenuConfirm() {
  playOnce('/sound/ui/menu_confirm.wav', 0.6);
}
// === COUNTDOWN ===
export function playCountTick() {
  playOnce('/sound/ui/count_tick.wav', 0.6);
}

export function playCountStart() {
  playOnce('/sound/ui/count_start.wav', 0.8);
}

// RESULT SOUND
let resultEnterAudio = null;
let resultBgmAudio = null;

export function playResultEnter() {
  if (resultEnterAudio) {
    resultEnterAudio.pause();
    resultEnterAudio.currentTime = 0;
    resultEnterAudio = null;
  }

  resultEnterAudio = new Audio('/sound/ui/result_enter.wav');
  resultEnterAudio.volume = 0.7;
  resultEnterAudio.play().catch(() => { });
}

export function startResultBgm() {
  stopResultBgm();

  resultBgmAudio = new Audio('/sound/ui/result_loop.wav');
  resultBgmAudio.loop = true;
  resultBgmAudio.volume = 0.35;
  resultBgmAudio.play().catch(() => { });
}

export function stopResultBgm() {
  if (!resultBgmAudio) return;

  resultBgmAudio.pause();
  resultBgmAudio.currentTime = 0;
  resultBgmAudio = null;
}

export function singleBgm({
  src,
  loop = true,
  volume = 0.4,
  analyserRef,
} = {}) {
  if (menuBgmPlaying && menuBgmAudio && (src === undefined || menuBgmAudio.src.includes(src))) {
    if (analyserRef && analyserNode) {
      analyserRef.current = analyserNode;
    }
    return;
  }

  const finalSrc = src ?? MENU_BGM_LIST[0];

  stopMenuBgm();

  menuBgmAudio = new Audio();
  menuBgmAudio.crossOrigin = 'anonymous';
  menuBgmAudio.src = finalSrc;
  menuBgmAudio.loop = loop;

  const settings = getUserSettings();
  const bgmVol = settings ? settings.bgmVolume / 100 : 1;

  menuBgmBaseVolume = volume * bgmVol;
  menuBgmAudio.volume = menuBgmBaseVolume;
  menuBgmAudio.setAttribute('playsinline', '');

  // ✅ 공통 함수 사용으로 로직 통합
  _connectMenuAudioGraph(menuBgmAudio);

  if (analyserRef) analyserRef.current = analyserNode;

  menuBgmAudio.play().catch(() => { });

  menuBgmPlaying = true;
  menuBgmUserPaused = false;

  console.log('[BGM]', { ctx: audioCtx?.state, analyser: !!analyserNode, source: !!sourceNode });
}

let previewAudio = null;
let previewTimer = null;

const PREVIEW_ENABLED_KEY = 'previewEnabled';
export function isPreviewEnabled() {
  const v = localStorage.getItem(PREVIEW_ENABLED_KEY);
  return v !== 'false'; // 기본 ON
}

export function setPreviewEnabled(enabled) {
  localStorage.setItem(PREVIEW_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function stopPreview() {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }

  if (!previewAudio) return;

  previewAudio.pause();
  previewAudio.currentTime = 0;
  previewAudio = null;
  restoreMenuBgmVolume();
}

export function playPreview(
  src,
  {
    startSec = 0,
    durationSec = 8,
    volume = 0.8,
  } = {}
) {
  if (!isPreviewEnabled()) return;

  stopPreview();

  const settings = getUserSettings();
  const pvVol = settings ? settings.previewVolume / 100 : 1;
  previewAudio = new Audio(src);
  previewAudio.volume = volume * pvVol;
  previewAudio.currentTime = startSec;
  muteMenuBgm();
  previewAudio.play().catch(() => { });

  previewTimer = setTimeout(() => {
    stopPreview();
  }, durationSec * 1000);
}

let unlockGainNode = null;

export function unlockAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => { });
  }

  // ✅ Chrome에서 graph 안 살아나는 경우 강제 활성화
  if (!unlockGainNode) {
    unlockGainNode = audioCtx.createGain();
    unlockGainNode.gain.value = 0;
    unlockGainNode.connect(audioCtx.destination);
  }
}

export function getMenuAnalyser() {
  return analyserNode;
}