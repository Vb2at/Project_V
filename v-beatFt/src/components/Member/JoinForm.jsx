import React from 'react';
import { useRef, useState } from 'react';

export default function JoinForm() {
    const [form, setForm] = useState({
        username: '',
        password: '',
        passwordConfirm: '',
        nickname: '',
        email: '',
        code: '',
    });

    const [errorMessage, setErrorMessage] = useState('');
    const [sendingMail, setSendingMail] = useState(false);

    // ✅ ref (포커스 제어)
    const usernameRef = useRef(null);
    const passwordRef = useRef(null);
    const passwordConfirmRef = useRef(null);
    const nicknameRef = useRef(null);
    const emailRef = useRef(null);
    const codeRef = useRef(null);

    const update = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
    };

    /* =========================
       ✅ 공통 에러 처리 유틸
    ========================= */
    const raiseError = (msg, ref) => {
        setErrorMessage(msg);
        ref?.current?.focus();
        ref?.current?.classList.add('is-error');
        setTimeout(() => ref?.current?.classList.remove('is-error'), 300);
    };

    /* =========================
       ✅ 가입 검증
    ========================= */
    const handleJoin = () => {
        if (!form.username) {
            return raiseError('아이디를 입력하세요.', usernameRef);
        }
        if (!form.password) {
            return raiseError('비밀번호를 입력하세요.', passwordRef);
        }
        if (!form.passwordConfirm) {
            return raiseError('비밀번호 확인을 입력하세요.', passwordConfirmRef);
        }
        if (form.password !== form.passwordConfirm) {
            return raiseError('비밀번호가 일치하지 않습니다.', passwordConfirmRef);
        }
        if (!form.nickname) {
            return raiseError('닉네임을 입력하세요.', nicknameRef);
        }
        if (!form.email) {
            return raiseError('이메일을 입력하세요.', emailRef);
        }

        setErrorMessage('');
        console.log('JOIN OK', form);
    };

    /* =========================
       ✅ 이메일 인증 (로딩 Mock)
    ========================= */
    const handleSendMail = () => {
        if (!form.email) {
            return raiseError('이메일을 입력하세요.', emailRef);
        }

        setErrorMessage('');
        setSendingMail(true);

        // 🔧 나중에 API 연결
        setTimeout(() => {
            setSendingMail(false);
            codeRef.current?.focus();
            console.log('MAIL SENT');
        }, 1200);
    };

    return (
        <>
            {/* ===== 카드 ===== */}
            <div
                style={{
                    width: 560,
                    padding: '48px 40px',
                    borderRadius: 18,
                    background: 'rgb(56,56,56)',
                    boxShadow: `
            0 20px 60px rgba(0,0,0,0.6),
            inset 0 0 0 1px rgba(255,255,255,0.05)
          `,
                    color: '#fff',
                }}
            >
                <h2
                    style={{
                        textAlign: 'center',
                        marginBottom: 28,
                        fontSize: 28,
                        fontWeight: 700,
                    }}
                >
                    회원가입
                </h2>

                <FormRow label="아이디">
                    <Input ref={usernameRef} value={form.username} onChange={update('username')} placeholder="아이디" />
                </FormRow>

                <FormRow label="비밀번호">
                    <Input
                        ref={passwordRef}
                        type="password"
                        value={form.password}
                        onChange={update('password')}
                        placeholder="비밀번호"
                    />
                </FormRow>

                <FormRow label="비밀번호 확인">
                    <Input
                        ref={passwordConfirmRef}
                        type="password"
                        value={form.passwordConfirm}
                        onChange={update('passwordConfirm')}
                        placeholder="비밀번호 확인"
                    />
                </FormRow>

                <FormRow label="닉네임">
                    <Input ref={nicknameRef} value={form.nickname} onChange={update('nickname')} placeholder="닉네임" />
                </FormRow>

                <FormRow label="이메일">
                    <div style={{ display: 'flex', gap: 10 }}>
                        <Input
                            ref={emailRef}
                            style={{ flex: 1 }}
                            value={form.email}
                            onChange={update('email')}
                            placeholder="이메일"
                        />

                        <SubButton onClick={handleSendMail} disabled={sendingMail}>
                            {sendingMail ? (
                                <span className="loading loading-spinner loading-sm" style={{ color: '#fff' }} />

                            ) : (
                                '인증'
                            )}
                        </SubButton>
                    </div>
                </FormRow>

                <FormRow label="인증코드">
                    <div style={{ display: 'flex', gap: 10 }}>
                        <Input
                            ref={codeRef}
                            style={{ flex: 1 }}
                            value={form.code}
                            onChange={update('code')}
                            placeholder="인증코드 6자리"
                        />
                        <SubButton>확인</SubButton>
                    </div>
                </FormRow>

                {/* ✅ 에러 메시지 공간 고정 */}
                <div
                    style={{
                        position: 'relative',
                        height: 20,
                        marginTop: 6,
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ff6b6b',
                            fontSize: 13,
                            pointerEvents: 'none',
                            opacity: errorMessage ? 1 : 0,
                        }}
                    >
                        {errorMessage || '\u00A0'}
                    </div>
                </div>
            </div>

            {/* ===== 가입 버튼 (카드 밖) ===== */}
            <div
                style={{
                    marginTop: 28,
                    textAlign: 'center',
                }}
            >
                <button
                    onClick={handleJoin}
                    style={{
                        width: 180,
                        height: 46,
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #00aeffff, #00ccffff)',
                        color: '#000',
                        fontWeight: 700,
                        fontSize: 15,
                    }}
                >
                    가입
                </button>
            </div>
        </>
    );
}

/* =========================
   공통 컴포넌트
========================= */

function FormRow({ label, children }) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                alignItems: 'center',
                gap: 16,
                marginBottom: 16,
            }}
        >
            <div style={{ fontWeight: 600 }}>{label}</div>
            {children}
        </div>
    );
}

const Input = React.forwardRef(function Input({ style, ...props }, ref) {
    return (
        <input
            ref={ref}
            className="login-input"
            {...props}
            style={{
                height: 44,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                fontSize: 18,
                padding: '0 18px',
                boxSizing: 'border-box',
                outline: 'none',
                ...style,
            }}
        />
    );
});

function SubButton({ children, ...props }) {
    return (
        <button
            {...props}
            style={{
                height: 44,
                padding: '0 18px',
                borderRadius: 10,
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.35)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: 14,
                fontWeight: 500,
                opacity: props.disabled ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {children}
        </button >
    );
}
