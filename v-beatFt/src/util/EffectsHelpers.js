// src/util/EffectsHelpers.js

function fallbackId() {
  return `tap-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/**
 * tap effect를 "항상 유니크 id 포함"해서 추가
 * @param {Function} setEffects - React setEffects
 * @param {number} lane
 * @param {Object} options
 * @param {boolean} options.autoRemove - true면 다음 tick에 자동 제거
 */
export function addTapEffect(setEffects, lane, { autoRemove = false } = {}) {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    fallbackId();

  const tap = {
    type: 'tap',
    lane,
    id,
  };

  setEffects(prev => [...prev, tap]);

  // tap을 "이벤트"처럼 쓰고 싶을 때
  if (autoRemove) {
    queueMicrotask(() => {
      setEffects(prev => prev.filter(e => e.id !== id));
    });
  }

  return id;
}

/**
 * long effect 추가 (필요하면 id/noteId 보장용)
 */
export function addLongEffect(setEffects, effect) {
  setEffects(prev => [...prev, effect]);
}
