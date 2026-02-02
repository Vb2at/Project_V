// src/pages/multi/MultiSocket.js
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';

/**
 * Single STOMP client for multi.
 * - connectMultiSocket()는 여러 컴포넌트에서 호출돼도 1개 인스턴스만 유지
 * - roomId 변경 시 안전하게 재구독
 * - 연결 전 publish는 큐에 적재 후 onConnect에서 flush
 * - 핸들러는 set/clear 가능(언마운트 안전)
 */

let client = null;
let connected = false;

let currentRoomId = null;
let desiredRoomId = null;

let subs = {
  room: null,
  score: null,
  rtc: null,
  leave: null,
  roomClosed: null,
};

let handlers = {
  onConnect: null,
  onDisconnect: null,
  onRoomMessage: null,
  onScoreMessage: null,
  onRtcMessage: null,
  onLeaveMessage: null,
  onRoomClosed: null,
  onStompError: null,
  onWsClose: null,
};

const pendingPublishes = []; // { destination, body, headers }

function log(...args) {
  // console.log('[MultiSocket]', ...args);
}

function safeJsonParse(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function flushPublishes() {
  if (!client || !connected) return;
  if (!pendingPublishes.length) return;

  const list = pendingPublishes.splice(0);
  for (const p of list) {
    try {
      client.publish({
        destination: p.destination,
        body: p.body,
        headers: p.headers ?? {},
      });
    } catch {
      // flush 중 실패는 재큐하지 않음
    }
  }
  log('flushPublishes', list.length);
}

function unsubscribeAllRoomTopics() {
  try { subs.room?.unsubscribe?.(); } catch { }
  try { subs.score?.unsubscribe?.(); } catch { }
  try { subs.rtc?.unsubscribe?.(); } catch { }
  try { subs.leave?.unsubscribe?.(); } catch { }

  subs.room = null;
  subs.score = null;
  subs.rtc = null;
  subs.leave = null;

  currentRoomId = null;
}

function resubscribeRoomTopics(roomId) {
  if (!client || !connected) return;
  if (!roomId) return;

  if (currentRoomId === roomId && subs.room) return;

  unsubscribeAllRoomTopics();
  currentRoomId = roomId;

  subs.room = client.subscribe(`/topic/multi/room/${roomId}`, (msg) => {
    const data = safeJsonParse(msg.body);
    handlers.onRoomMessage?.(data, msg);

    // ★ 추가: 멀티 시작 확정 시 GamePlay로 rival 전달
    if (data?.type === 'ROOM_STATE' && data?.started === true) {
      const players = data.players || [];
      const myId = data.myUserId;

      const rival = players.find(p => Number(p.userId) !== Number(myId)) || null;

      window.dispatchEvent(
        new CustomEvent('multi:start', {
          detail: {
            type: 'MULTI_START',
            roomId,
            rival,
          },
        })
      );
    }
  });

  subs.score = client.subscribe(`/topic/multi/room/${roomId}/score`, (msg) => {
    const data = safeJsonParse(msg.body);
    handlers.onScoreMessage?.(data, msg);
  });

  subs.rtc = client.subscribe(`/topic/multi/room/${roomId}/rtc`, (msg) => {
    const data = safeJsonParse(msg.body);
    handlers.onRtcMessage?.(data, msg);
  });

  subs.leave = client.subscribe(`/topic/multi/room/${roomId}/leave`, (msg) => {
    const data = safeJsonParse(msg.body);
    handlers.onLeaveMessage?.(data, msg);
  });

  log('resubscribeRoomTopics', roomId);
}

function ensureUserQueueSub() {
  if (!client || !connected) return;
  if (subs.roomClosed) return;

  subs.roomClosed = client.subscribe('/user/queue/room-closed', (msg) => {
    const data = safeJsonParse(msg.body);
    handlers.onRoomClosed?.(data, msg);
  });
}

function ensureClient() {
  if (client) return;

  client = new Client({
    webSocketFactory: () =>
      new SockJS('http://localhost:8080/ws', null, { withCredentials: true }),
    reconnectDelay: 3000,
    debug: () => { },

    onConnect: () => {
      connected = true;
      log('connected');

      currentRoomId = null;
      // user queue는 방과 무관하게 1회 유지
      ensureUserQueueSub();

      // room topics
      if (desiredRoomId) {
        resubscribeRoomTopics(desiredRoomId);
      }
      publishMulti('/app/multi/enter', { roomId: desiredRoomId });
      // 연결 전 publish flush
      flushPublishes();

      handlers.onConnect?.();
    },

    onDisconnect: () => {
      connected = false;
      log('disconnected');
      handlers.onDisconnect?.();
    },

    onStompError: (frame) => {
      handlers.onStompError?.(frame);
    },

    onWebSocketClose: (evt) => {
      connected = false;
      handlers.onWsClose?.(evt);
    },
  });

  client.activate();
}

/**
 * 핸들러 "완전 교체" (언마운트 시 clear 용도로도 사용)
 */
export function setMultiSocketHandlers(next = {}) {
  handlers = {
    onConnect: next.onConnect ?? null,
    onDisconnect: next.onDisconnect ?? null,
    onRoomMessage: next.onRoomMessage ?? null,
    onScoreMessage: next.onScoreMessage ?? null,
    onRtcMessage: next.onRtcMessage ?? null,
    onLeaveMessage: next.onLeaveMessage ?? null,
    onRoomClosed: next.onRoomClosed ?? null,
    onStompError: next.onStompError ?? null,
    onWsClose: next.onWsClose ?? null,
  };
}

/**
 * 멀티 소켓 연결/유지 (여러 번 호출 가능)
 * - replaceHandlers=true면 handlers 완전 교체
 */
export function connectMultiSocket({
  roomId,
  onConnect,
  onDisconnect,
  onRoomMessage,
  onScoreMessage,
  onRtcMessage,
  onLeaveMessage,
  onRoomClosed,
  onStompError,
  onWsClose,
  replaceHandlers = false,
} = {}) {
  if (replaceHandlers) {
    setMultiSocketHandlers({
      onConnect,
      onDisconnect,
      onRoomMessage,
      onScoreMessage,
      onRtcMessage,
      onLeaveMessage,
      onRoomClosed,
      onStompError,
      onWsClose,
    });
  } else {
    handlers = {
      onConnect: onConnect ?? handlers.onConnect,
      onDisconnect: onDisconnect ?? handlers.onDisconnect,
      onRoomMessage: onRoomMessage ?? handlers.onRoomMessage,
      onScoreMessage: onScoreMessage ?? handlers.onScoreMessage,
      onRtcMessage: onRtcMessage ?? handlers.onRtcMessage,
      onLeaveMessage: onLeaveMessage ?? handlers.onLeaveMessage,
      onRoomClosed: onRoomClosed ?? handlers.onRoomClosed,
      onStompError: onStompError ?? handlers.onStompError,
      onWsClose: onWsClose ?? handlers.onWsClose,
    };
  }

  desiredRoomId = roomId ?? desiredRoomId;

  ensureClient();

  if (connected && desiredRoomId) {
    resubscribeRoomTopics(desiredRoomId);
  }
}

export function disconnectMultiSocket() {
  if (!client) return;

  // room topics
  unsubscribeAllRoomTopics();

  // user queue
  try { subs.roomClosed?.unsubscribe?.(); } catch { }
  subs.roomClosed = null;

  // 상태
  desiredRoomId = null;
  connected = false;
  pendingPublishes.splice(0);

  // handlers clear (안전)
  setMultiSocketHandlers({});

  try {
    client.deactivate();
  } catch { }

  client = null;
}

export function isMultiSocketConnected() {
  return Boolean(client && connected);
}

export function getMultiSocketRoomId() {
  return currentRoomId;
}

/** publish (연결 전이면 큐에 적재) */
export function publishMulti(destination, payloadObj, headers = {}) {
  const body = JSON.stringify(payloadObj ?? {});
  const packet = { destination, body, headers };

  if (!client || !connected) {
    pendingPublishes.push(packet);
    return false;
  }

  client.publish({ destination, body, headers });
  return true;
}

// ===== publish helpers =====
export function sendEnter(roomId, headers) {
  return publishMulti('/app/multi/enter', { roomId }, headers);
}

export function sendReady(roomId, headers) {
  return publishMulti('/app/multi/ready', { roomId }, headers);
}

export function sendStart(roomId, headers) {
  return publishMulti('/app/multi/start', { roomId }, headers);
}

export function sendLeave(roomId, headers) {
  return publishMulti('/app/multi/leave', { roomId }, headers);
}

// ===== RTC relay helpers =====
export function sendRtcOffer(roomId, offer, headers) {
  return publishMulti('/app/multi/rtc/offer', { roomId, offer }, headers);
}

export function sendRtcAnswer(roomId, answer, headers) {
  return publishMulti('/app/multi/rtc/answer', { roomId, answer }, headers);
}

export function sendRtcCandidate(roomId, candidate, headers) {
  return publishMulti('/app/multi/rtc/candidate', { roomId, candidate }, headers);
}

export function __getMultiStompClient() {
  return client;
}
