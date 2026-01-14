import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function NavLoading() {
  const navigate = useNavigate();
  const location = useLocation();
  const [msg, setMsg] = useState('LOADING');

  useEffect(() => {
    const run = async () => {
      // querystring target 우선, 없으면 state.target
      const qs = new URLSearchParams(location.search);
      const target = qs.get('target') || location.state?.target || '/main';

      setMsg('로그인 확인 중...');

      try {
        const res = await fetch('/api/auth/login/status', {
          method: 'GET',
          credentials: 'include',
        });

        const data = await res.json();

        if (!data.ok) {
          navigate('/login', { replace: true });
          return;
        }

        navigate(target, { replace: true });
      } catch (e) {
        navigate('/login', { replace: true });
      }
    };

    run();
  }, [location, navigate]);

  return (
    <div style={{ color: '#fff', textAlign: 'center', paddingTop: 120 }}>
      {msg}
    </div>
  );
}
