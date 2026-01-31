import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';

export default function FrameTestPage() {
  const canvasRef = useRef(null);
  const stompRef = useRef(null);
  const sendTimerRef = useRef(null);
  const lastRecvAtRef = useRef(0);

  const [roomId, setRoomId] = useState('TEST');
  const [userId, setUserId] = useState('1'); // Principal.name 으로 들어갈 값
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [recvFrame, setRecvFrame] = useState(null);

  // 캔버스에 “움직이는 화면” 그려서 프레임 변화 확인
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let raf = 0;
    let t = 0;

    const loop = () => {
      t += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f0';
      ctx.font = '16px monospace';
      ctx.fillText(`roomId: ${roomId}`, 10, 24);
      ctx.fillText(`userId: ${userId}`, 10, 44);
      ctx.fillText(`tick: ${t}`, 10, 64);

      // 움직이는 원
      const x = 40 + (t % (canvas.width - 80));
      const y = canvas.height / 2;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [roomId, userId]);

  const connect = () => {
    if (stompRef.current?.active) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 2000,
      // ★ 핵심: Principal 세팅용 (당신 서버가 CONNECT에서 userId를 Principal로 만든다는 전제)
      connectHeaders: { userId: String(userId) },
    });

    client.onConnect = () => {
      setConnected(true);

      // 수신 구독
      client.subscribe(`/topic/multi/room/${roomId}/frame`, (msg) => {
        // 서버는 Map.of(...)로 JSON을 보냄 → parse
        let data;
        try {
          data = JSON.parse(msg.body);
        } catch {
          return;
        }

        if (data?.type !== 'FRAME') return;

        // 로그 난발 방지: 2초에 1번만 수신 체크
        const now = Date.now();
        if (now - lastRecvAtRef.current > 2000) {
          // eslint-disable-next-line no-console
          console.log('[FRAME] recv', { roomId, from: data.userId, bytes: (data.frame || '').length });
          lastRecvAtRef.current = now;
        }

        setRecvFrame(data.frame);
      });

      // eslint-disable-next-line no-console
      console.log('[STOMP] connected');
    };

    client.onDisconnect = () => {
      setConnected(false);
      setSending(false);
      if (sendTimerRef.current) clearInterval(sendTimerRef.current);
      sendTimerRef.current = null;
      // eslint-disable-next-line no-console
      console.log('[STOMP] disconnected');
    };

    client.onStompError = (frame) => {
      // eslint-disable-next-line no-console
      console.log('[STOMP] error', frame?.headers?.message);
    };

    stompRef.current = client;
    client.activate();
  };

  const disconnect = () => {
    stopSend();
    stompRef.current?.deactivate();
    stompRef.current = null;
  };

  const startSend = () => {
    const client = stompRef.current;
    const canvas = canvasRef.current;
    if (!client?.connected || !canvas) return;
    if (sendTimerRef.current) return;

    setSending(true);
    // 1fps (필요하면 333ms=3fps로 바꾸세요)
    sendTimerRef.current = setInterval(() => {
      // dataURL (JPEG로 줄여서 전송량 감소)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.35);

      client.publish({
        destination: '/app/multi/frame',
        body: JSON.stringify({
          roomId,
          frame: dataUrl,
        }),
      });
    }, 1000);

    // eslint-disable-next-line no-console
    console.log('[FRAME] send start');
  };

  const stopSend = () => {
    if (sendTimerRef.current) clearInterval(sendTimerRef.current);
    sendTimerRef.current = null;
    setSending(false);
    // eslint-disable-next-line no-console
    console.log('[FRAME] send stop');
  };

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h2 style={{ margin: 0, marginBottom: 12 }}>WS Frame Test</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
        <label>
          roomId:&nbsp;
          <input value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ width: 140 }} />
        </label>
        <label>
          userId:&nbsp;
          <input value={userId} onChange={(e) => setUserId(e.target.value)} style={{ width: 80 }} />
        </label>

        {!connected ? (
          <button onClick={connect}>Connect</button>
        ) : (
          <button onClick={disconnect}>Disconnect</button>
        )}

        <button onClick={startSend} disabled={!connected || sending}>
          Start Send
        </button>
        <button onClick={stopSend} disabled={!sending}>
          Stop Send
        </button>

        <span style={{ marginLeft: 8 }}>
          status: {connected ? 'CONNECTED' : 'DISCONNECTED'} / {sending ? 'SENDING' : 'IDLE'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <div style={{ marginBottom: 8 }}>Sender Canvas</div>
          <canvas ref={canvasRef} width={420} height={240} style={{ border: '1px solid #444' }} />
          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
            publish: /app/multi/frame (JSON: roomId, frame)
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 8 }}>Receiver Image</div>
          <div style={{ width: 420, height: 240, border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {recvFrame ? (
              <img src={recvFrame} alt="recv" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ color: '#666' }}>No frame yet</span>
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
            subscribe: /topic/multi/room/{roomId}/frame
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: '#666' }}>
        WS_URL: {WS_URL} (필요하면 VITE_WS_URL로 변경)
      </div>
    </div>
  );
}
