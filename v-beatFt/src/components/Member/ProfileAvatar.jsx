import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

export default function ProfileAvatar({
  profileImg,
  userId,
  size = 28,
  marginRight = 0,
}) {
  const colorIndex = (Number(userId) || 0) % 8;

  const gradients = [
    'linear-gradient(135deg, #008c8c, #00b4b4)',
    'linear-gradient(135deg, #6a11cb, #2575fc)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #30cfd0, #330867)',
    'linear-gradient(135deg, #a8edea, #fed6e3)',
  ];

  const [broken, setBroken] = useState(false);

  const src = useMemo(() => {
    if (!profileImg) return null;
    const s = String(profileImg).trim();

    //구글/외부 프사면 그대로
    if (s.startsWith('http://') || s.startsWith('https://')) return s;

    ///upload/..." 형태면 host만 붙이기
    if (s.startsWith('/')) return `http://localhost:8080${s}`;

    //DB에 저장된 "profileImg/xxx.png" 같은 상대경로는 /upload/ 밑으로
    return `http://localhost:8080/upload/${s}`;
  }, [profileImg]);

  //프로필 이미지 있으면
  if (src && !broken) {
    const finalSrc =
      src.startsWith('http://localhost:8080')
        ? `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`
        : src;

    return (
      <img
        src={finalSrc}
        alt="profile"
        onError={() => setBroken(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          border: '2px solid #008c8c',
          marginRight,
        }}
      />
    );
  }

  return (
    <div
      style={{
        background: gradients[colorIndex],
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        border: '2px solid #008c8c',
        marginRight,
      }}
    >
      <FontAwesomeIcon icon={faUser} style={{ fontSize: size * 0.6, color: '#ffffff' }} />
    </div>
  );
}
