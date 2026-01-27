// pages/mainpage/MainPage.jsx
import Background from '../../components/Common/Background';
import MainOverlay from './MainOverlay';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { playMenuBgmRandom } from '../../components/engine/SFXManager';
import { statusApi } from '../../api/auth';

export default function MainPage() {
  const { state } = useLocation();
  const [showPwModal, setShowPwModal] = useState(false);

  useEffect(() => {
    playMenuBgmRandom();
  }, []);

useEffect(() => {
  (async () => {
    try {
      const res = await statusApi();
      if(res.data?.ok && res.data.needPwChange === true) {
        setShowPwModal(true);
      }
    } catch(e) {
      //로그인 안된 경우 아무것도 못 함
    }
  })();
}, []);

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
