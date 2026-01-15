import './Login.css';
import LoginForm from '../../components/Member/LoginForm';
import LoginNoteRain from './LoginNoteRain';

export default function Login() {
  const LOGIN_BGM_SRC = '/sound/bgm/menu2.mp3';


  return (
    <div className="login-page">
      <LoginNoteRain />
      {/* 상단 Hero 영역 */}
      <section className="login-hero">
        {/* 배경 */}
        <div
          className="hero-bg"
          style={{
            background: `
              linear-gradient(
                180deg,
                #8f0015 0%,
                #120000 50%,
                #007a86 100%
              )
            `,
          }}
        />

        {/* 오버레이 */}
        <div
          className="hero-overlay"
          style={{
            background: `
              radial-gradient(
                circle at center,
                rgba(0,0,0,0.05) 0%,
                rgba(0,0,0,0.15) 60%,
                rgba(0,0,0,0.30) 100%
              )
            `,
          }}
        />
        {/* 중앙 컨텐츠 */}
        <div
          className="hero-content"
          style={{
            paddingTop: 80,
            paddingBottom: 48,
            paddingInline: 24,
            gap: 8,
          }}
        >


          {/* 로그인 폼 */}
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
