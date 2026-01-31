// pages/mainpage/MainPage.jsx
import Background from '../../components/Common/Background';
import MainOverlay from './MainOverlay';
import Header from '../../components/Common/Header'; // Header 추가
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { playMenuBgmRandom } from '../../components/engine/SFXManager';
import { statusApi } from '../../api/auth';

export default function MainPage({ onLogout }) { // ← props로 onLogout 받음
  const { state } = useLocation();
  const [showPwModal, setShowPwModal] = useState(false);

  useEffect(() => {
    playMenuBgmRandom();
  }, []);

  // 임시 비밀번호 변경 체크
  useEffect(() => {
    (async () => {
      try {
        const res = await statusApi();
        if (res.data?.ok && res.data.needPwChange === true) {
          setShowPwModal(true);
        }
      } catch (e) {
        // 로그인 안된 경우 무시
      }
    })();
  }, []);

  return (
    <>
      <Header onLogout={onLogout} /> {/* Header에 onLogout 전달 */}
      <Background />
      <MainOverlay
        showPwChangeModal={showPwModal}
        onClosePwChangeModal={() => setShowPwModal(false)}
      />
    </>
  );
}
