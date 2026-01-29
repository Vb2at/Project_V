import { useState } from 'react';
import { createPortal } from 'react-dom';

/* ===== 대분류 (UI 공통 3개) ===== */
const MAIN_REASONS_BY_TYPE = {
    CONTENT: ['콘텐츠', '기타'],
    USER: ['콘텐츠', '커뮤니티', '기타'],
    MESSAGE: ['커뮤니티', '기타'],
};

/*
신고 대상 타입:
- CONTENT : 곡 / 업로드 콘텐츠
- USER    : 유저 + 메시지 (메시지는 USER로 흡수)
*/

/* ===== 대분류 → 소분류 매핑 ===== */
const SUB_REASON_MAP = {
    CONTENT: {
        콘텐츠: ['저작권 침해', '부적절한 콘텐츠'],
        커뮤니티: [],
        기타: ['기타'],
    },

    USER: {
        콘텐츠: ['부적절한 프로필/닉네임', '부적절한 메시지 내용'],
        커뮤니티: ['욕설/비방', '스팸', '혐오 발언'],
        기타: ['기타'],
    },
};

/* ===== placeholder 안내 ===== */
const PLACEHOLDER = {
    '저작권 침해':
        '예) 원곡 음원을 무단 사용했거나 권한 없이 업로드한 경우 등',
    '부적절한 콘텐츠':
        '예) 선정적이거나 불쾌감을 주는 이미지/사운드가 포함된 경우 등',
    '부적절한 프로필/닉네임':
        '예) 욕설·혐오 표현이 포함된 닉네임이나 프로필 이미지 등',
    '부적절한 메시지 내용':
        '예) 선정적이거나 불쾌감을 주는 내용, 불법 정보 포함 등',
    '욕설/비방':
        '예) 특정인을 모욕하거나 공격하는 표현, 비하 발언 등',
    '스팸':
        '예) 광고, 반복 메시지, 의미 없는 도배 등',
    '혐오 발언':
        '예) 성별, 인종, 집단을 향한 차별적 표현 등',
    '기타':
        '문제가 되는 상황을 구체적으로 설명해 주세요.',
};

export default function UserReportModal({
    open,
    type, // 'CONTENT' | 'USER'
    targetId,
    targetName,
    targetProfileImg,
    onClose,
    onSubmit,
}) {
    const [mainReason, setMainReason] = useState('');
    const [reason, setReason] = useState('');
    const [desc, setDesc] = useState('');
    if (!open) return null;

    function handleSubmit() {

        if (!mainReason) {
            alert('신고 사유를 선택해주세요.');
            return;
        }

        const targetType = type; //user content

        // 소분류 없으면 mainReason로 대체(예: 기타만 있는 경우)
        const sub = reason || mainReason;

        // reasonCode 생성 (공백/슬래시 같은거 안전하게)
        const norm = (s) => String(s).trim().replace(/\s+/g, '_').replace(/[/]/g, '_');
        const reasonCode = `${norm(mainReason)}_${norm(sub)}`;

        onSubmit?.({
            targetType,
            targetId,
            reasonCode,
            description: desc,
        });

        setMainReason('');
        setReason('');
        setDesc('');
        onClose();
    }

    return createPortal(
        <div style={overlay}>
            <div style={modal}>

                <h3 style={{ marginBottom: 8 }}>신고하기</h3>

                {/* 대상 */}
                <section style={section}>
                    <span style={sectionTitle}>신고 대상</span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={avatarWrap}>
                            {targetProfileImg ? (
                                <img
                                    src={encodeURIComponent(targetProfileImg)}
                                    alt={targetName || '유저'}
                                    style={avatarImg}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}

                                />
                            ) : null}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div>{type}</div>
                            <div>{targetName}</div>
                        </div>
                    </div>
                </section>

                {/* 사유 - 대분류 */}
                <section style={section}>
                    <span style={sectionTitle}>사유</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {(MAIN_REASONS_BY_TYPE[type] || []).map((m) => (
                            <button
                                type="button"
                                key={m}
                                onClick={() => {
                                    setMainReason(m);
                                    setReason('');
                                }}
                                style={{
                                    ...reasonBtn,
                                    ...(mainReason === m ? reasonBtnActive : {}),
                                }}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 사유 - 소분류 */}
                {mainReason && (
                    <section style={section}>
                        <span style={sectionTitle}>세부 사유</span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {(SUB_REASON_MAP[type]?.[mainReason] || []).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setReason(r)}
                                    style={{
                                        ...reasonBtn,
                                        ...(reason === r ? reasonBtnActive : {}),
                                    }}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* 설명 */}
                <section style={section}>
                    <span style={sectionTitle}>상세 설명 (선택)</span>
                    <textarea
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        style={textarea}
                        placeholder={
                            reason
                                ? PLACEHOLDER[reason] ||
                                '문제가 되는 내용을 구체적으로 작성해 주세요.'
                                : '세부 사유를 먼저 선택해 주세요.'
                        }
                    />
                </section>

                {/* 하단 버튼 */}
                <div style={footer}>
                    <button type="button" style={footerBtn} onClick={onClose}>
                        취소
                    </button>
                    <button type="button" style={footerBtnMain} onClick={handleSubmit}>
                        신고
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/* ===== styles ===== */

const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
};

const modal = {
    width: 460,
    background: '#0b0b0b',
    border: '1px solid #333',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};

const section = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
};

const sectionTitle = {
    fontWeight: 600,
    color: '#5aeaff',
};

const avatarWrap = {
    width: 42,
    height: 42,
    borderRadius: 999,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.2)',
    background: '#111',
    flex: '0 0 auto',
};

const avatarImg = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
};

const textarea = {
    background: '#111',
    border: '1px solid #333',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
    minHeight: 70,
    resize: 'none',
};

const reasonBtn = {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
};

const reasonBtnActive = {
    border: '1px solid #5aeaff',
    color: '#5aeaff',
    background: 'rgba(90,234,255,0.15)',
};

const footer = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
};

const footerBtn = {
    minWidth: 72,
    height: 34,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
};

const footerBtnMain = {
    ...footerBtn,
    border: '1px solid #5aeaff',
    color: '#5aeaff',
    background: 'rgba(90,234,255,0.15)',
};
