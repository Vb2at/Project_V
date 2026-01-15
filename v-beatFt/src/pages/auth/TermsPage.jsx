import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TERMS } from './TermsText';
import './TermsPage.css';

export default function TermsPage() {
  const navigate = useNavigate();
  const [showWarn, setShowWarn] = useState(false);

  const initial = Object.keys(TERMS).reduce((acc, k) => {
    acc[k] = false;
    return acc;
  }, {});

  const [checked, setChecked] = useState(initial);

  const toggleOne = (key) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const requiredKeys = Object.keys(TERMS).filter(k => TERMS[k].required);
  const allRequiredChecked = requiredKeys.every(k => checked[k]);
  const allChecked = Object.keys(checked).every(k => checked[k]);

  const toggleAll = (v) => {
    const next = {};
    Object.keys(checked).forEach(k => (next[k] = v));
    setChecked(next);
  };

  const handleNext = () => {
    if (!allRequiredChecked) {
      setShowWarn(true);
      return;
    }

    navigate('/join', {
      state: {
        terms: checked,
        agreedAt: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="terms-page">
      <div className="terms-card">

        <h1 className="terms-title">회원가입 약관 동의</h1>

        {/* 전체 동의 */}
        <label className="terms-all">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          전체 약관에 동의합니다
        </label>

        {/* 개별 약관 */}
        <div className="terms-list">
          {Object.entries(TERMS).map(([key, t]) => (
            <div
              key={key}
              className={`terms-item ${
                showWarn && t.required && !checked[key] ? 'terms-warn' : ''
              }`}
            >
              <label className="terms-item-head">
                <input
                  type="checkbox"
                  checked={checked[key]}
                  onChange={() => toggleOne(key)}
                />
                {t.required ? '(필수)' : '(선택)'} {t.title}
              </label>

              <div className="terms-box">
                {t.content}
              </div>
            </div>
          ))}
        </div>

        {/* 버튼 */}
        <div className="terms-actions">
          <button className="terms-btn ghost" onClick={() => navigate(-1)}>
            이전
          </button>
          <button
            className="terms-btn primary"
            disabled={!allRequiredChecked}
            onClick={handleNext}
          >
            다음
          </button>
        </div>

      </div>
    </div>
  );
}
