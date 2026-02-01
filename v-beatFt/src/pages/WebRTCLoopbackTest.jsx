import { useEffect, useRef } from 'react';

function WebRTCLoopbackTest() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    let pc1, pc2;

    (async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');

      let t = 0;
      setInterval(() => {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = 'red';
        ctx.fillRect(50 + (t++ % 200), 80, 40, 40);
      }, 16);

      const stream = canvas.captureStream(30);

      localVideoRef.current.srcObject = stream;

      pc1 = new RTCPeerConnection();
      pc2 = new RTCPeerConnection();

      stream.getTracks().forEach(track => {
        pc1.addTrack(track, stream);
      });

      pc2.ontrack = (e) => {
        remoteVideoRef.current.srcObject = e.streams[0];
      };

      pc1.onicecandidate = e => e.candidate && pc2.addIceCandidate(e.candidate);
      pc2.onicecandidate = e => e.candidate && pc1.addIceCandidate(e.candidate);

      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      await pc2.setRemoteDescription(offer);

      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      await pc1.setRemoteDescription(answer);
    })();

    return () => {
      pc1?.close();
      pc2?.close();
    };
  }, []);

  return (
    <div style={{ display: 'flex', gap: 20, padding: 20 }}>
      <div>
        <h3>LOCAL</h3>
        <video ref={localVideoRef} autoPlay muted playsInline />
      </div>
      <div>
        <h3>REMOTE</h3>
        <video ref={remoteVideoRef} autoPlay muted playsInline />
      </div>
    </div>
  );
}

export default WebRTCLoopbackTest;
