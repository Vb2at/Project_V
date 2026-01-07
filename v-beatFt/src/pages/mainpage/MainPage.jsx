// pages/mainpage/MainPage.jsx
import Background from '../../components/Common/Background';
import MainOverlay from './MainOverlay';
import { useEffect } from 'react';
import { playMenuBgmRandom } from '../../components/engine/SFXManager';

export default function MainPage() {
  useEffect(() => {
    playMenuBgmRandom();
  }, []);
  return (
    <>
      <Background />
      <MainOverlay />
    </>
  );
}
