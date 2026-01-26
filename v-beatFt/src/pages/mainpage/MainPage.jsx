// pages/mainpage/MainPage.jsx
import Background from '../../components/Common/Background';
import MainOverlay from './MainOverlay';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { playMenuBgmRandom } from '../../components/engine/SFXManager';

export default function MainPage() {
  const { state } = useLocation();
  const [showPwModal, setShowPwModal] = useState(false);

  useEffect(() => {
    playMenuBgmRandom();
  }, []);

useEffect(() => {
  setShowPwModal(true); // ✅ 무조건 모달 띄우기 테스트용, 끝나면 지우고 밑에있는 주석으로 교체
}, []);

  // useEffect(() => {
  //   if (state?.needPwChange === true) {
  //     setShowPwModal(true);
  //   }
  // }, [state]);

  return (
    <>
      <Background />
      <MainOverlay
        showPwChangeModal={showPwModal}
        onClosePwChangeModal={() => setShowPwModal(false)}
      />
    </>
  );
}
