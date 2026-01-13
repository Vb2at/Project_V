const BASE_VOLUME = {
  normal: 1.0,
  accent: 1.0,
};

function playOnce(src, volume = 1.0) {
  const audio = new Audio(src);
  audio.volume = volume;
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
  menuBgmAudio.loop = false;
  menuBgmAudio.volume = 0.4;
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

  // ✅ analyser 정리
  if (sourceNode) sourceNode.disconnect();
  if (analyserNode) analyserNode.disconnect();
  if (audioCtx) audioCtx.close();

  sourceNode = null;
  analyserNode = null;
  audioCtx = null;
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

let audioCtx = null;
let analyserNode = null;
let sourceNode = null;

export function singleBgm({
  src,
  loop = true,
  volume = 0.4,
  analyserRef,
} = {}) {
  stopMenuBgm();

  menuBgmUserPaused = false;

  const finalSrc = src ?? MENU_BGM_LIST[0];
  menuBgmAudio = new Audio(finalSrc);
  menuBgmAudio.loop = loop;
  menuBgmAudio.volume = volume;

  // ✅ analyser 연결
  if (analyserRef) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;

    sourceNode = audioCtx.createMediaElementSource(menuBgmAudio);
    sourceNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);

    analyserRef.current = analyserNode;
  }

  menuBgmAudio.play().catch(() => { });
  menuBgmPlaying = true;
}