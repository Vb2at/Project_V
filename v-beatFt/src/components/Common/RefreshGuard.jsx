// src/components/Common/RefreshGuard.jsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * F5(새로고침) 시 "예외 페이지만 유지"하고,
 * 그 외 모든 페이지는 /main으로 강제 이동
 */
const ALLOWED_PATHS = [
  '/main',
  '/login',
  '/',
  '/landing',
  '/join',
  '/start',
  '/terms'
];

export default function RefreshGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  // ① 새로고침 감지
  useEffect(() => {
    const onBeforeUnload = (e) => {
      const path = location.pathname;

      const isAllowed = ALLOWED_PATHS.some(p => path === p);

      if (!isAllowed) {
        console.log('[REFRESH BLOCK]', path);

        // 브라우저 기본 경고 유지
        e.preventDefault();
        e.returnValue = '';

        // 다음 로드 시 강제 메인
        sessionStorage.setItem('forceMainAfterRefresh', 'true');
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [location.pathname]);

  // ② 새로고침 직후 최초 마운트 처리
  useEffect(() => {
    const flag = sessionStorage.getItem('forceMainAfterRefresh');

    if (flag === 'true') {
      sessionStorage.removeItem('forceMainAfterRefresh');
      console.log('[REDIRECT TO /main AFTER REFRESH]');
      navigate('/main', { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
