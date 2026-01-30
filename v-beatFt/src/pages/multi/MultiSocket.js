// src/pages/multi/MultiSocket.js
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';

let client = null;

export function connectMultiSocket({ roomId, onRoomMessage, onRoomClosed }) {
  if (client) return;

  client = new Client({
    webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
    reconnectDelay: 3000,
    debug: () => {},
    onConnect: () => {
      // room 메시지
      client.subscribe(`/topic/multi/room/${roomId}`, (msg) => {
        const data = JSON.parse(msg.body);
        onRoomMessage?.(data);
      });

      // 방 폭파
      client.subscribe('/user/queue/room-closed', () => {
        onRoomClosed?.();
      });
    },
  });

  client.activate();
}

export function disconnectMultiSocket() {
  if (!client) return;
  client.deactivate();
  client = null;
}

// ===== publish helpers =====
export function sendEnter(roomId) {
  client?.publish({
    destination: '/app/multi/enter',
    body: JSON.stringify({ roomId }),
  });
}

export function sendReady(roomId) {
  client?.publish({
    destination: '/app/multi/ready',
    body: JSON.stringify({ roomId }),
  });
}

export function sendStart(roomId) {
  client?.publish({
    destination: '/app/multi/start',
    body: JSON.stringify({ roomId }),
  });
}

export function sendLeave(roomId) {
  client?.publish({
    destination: '/app/multi/leave',
    body: JSON.stringify({ roomId }),
  });
}
