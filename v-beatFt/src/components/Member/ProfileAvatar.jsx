import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

export default function ProfileAvatar({
    profileImg,
    userId,
    size = 28,
    marginRight = 0,
}) {
    const colorIndex = userId % 8;

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

    // ✅ 프로필 이미지 있으면: 그것만
    if (profileImg) {
        return (
            <img
                src={profileImg}
                alt="profile"
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #008c8c',
                    marginRight,
                }}
            />
        );
    }

    // ✅ 없으면: 기본 사람 실루엣 템플릿
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
                fontSize: size * 0.6,
                border: '2px solid #008c8c',
                marginRight,
            }}
        >
            <FontAwesomeIcon
                icon={faUser}             
                style={{ fontSize: size * 0.6, color: '#ffffff' }} 
            />
        </div>
    );
}
