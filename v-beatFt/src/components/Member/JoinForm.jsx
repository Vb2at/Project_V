import React from 'react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// axios 인스턴스 생성
const api = axios.create({
    baseURL: 'http://localhost:8080',
    withCredentials: true,
});

export default function JoinForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        password: '',
        passwordConfirm: '',
        nickname: '',
        email: '',
        code: '',
    });

    const [errorMessage, setErrorMessage] = useState('');
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);
    const [sendingMail, setSendingMail] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [verified, setVerified] = useState(false);

    // ref
    const passwordRef = useRef(null);
    const passwordConfirmRef = useRef(null);
    const nicknameRef = useRef(null);
    const emailRef = useRef(null);
    const codeRef = useRef(null);

    const update = (key) => (e) => {
        const value = e.target.value;

        // 이메일 변경 시 인증 상태 초기화
        if (key === 'email') {
            setVerified(false);
            setForm((f) => ({ ...f, email: e.target.value, code: '' }));
            return;
        }
        setForm((f) => ({ ...f, [key]: e.target.value }));

        //비밀번호 입력 시 실시간 검증 -> 조건 만족하면 에러 메시지 제거
        if (key === 'password' && isValidPassword(value)) {
            setErrorMessage('');
        }

        if (key === 'passwordConfirm' && value === form.password) {
            setErrorMessage('');
        }
    };

    const raiseError = (msg, ref) => {
        setIsSuccessMessage(false);
        setErrorMessage(msg);
        ref?.current?.focus();
        ref?.current?.classList.add('is-error');
        setTimeout(() => ref?.current?.classList.remove('is-error'), 300);
    };

    const handleSendMail = async () => {
        if (!form.email) {
            return raiseError('이메일을 입력하세요.', emailRef);
        }

        setIsSuccessMessage(false);
        setErrorMessage('');
        setSendingMail(true);

        try {
            const emailCheck = await api.post('/api/auth/check-email', {
                email: form.email,
            });

            if (!emailCheck.data?.ok) {
                return raiseError(emailCheck.data.message, emailRef);
            }

            const { data } = await api.post('/api/auth/sendCode', {
                email: form.email,
            });

            if (!data?.ok) {
                return raiseError(data?.message || '인증코드 발송에 실패하였습니다.', emailRef);
            }

            setIsSuccessMessage(true);
            setErrorMessage('인증코드를 발송했습니다.');
            codeRef.current?.focus();
        } catch {
            return raiseError('서버 연결에 실패하였습니다.', emailRef);
        } finally {
            setSendingMail(false);
        }
    };

    //비밀번호 강화 체크 함수
    const isValidPassword = (pw) => {
        if (!pw) return false;
        if (pw.length < 8 || pw.length > 16) return false;
        const letter = /[a-zA-Z]/.test(pw);
        const digit = /[0-9]/.test(pw);
        return letter && digit;
    }

    //비밀번호 검증 (Spring 연동)
    //POST /api/auth/check-loginPw
    const handleCheckPassword = async () => {
        if (!form.password) return;

        //서버 확인 이전에 프론트에서 먼저 강화 체크
        if (!isValidPassword(form.password)) {
            return raiseError(
                '비밀번호는 8~16자리, 영문+숫자를 포함해야 합니다.',
                passwordRef
            );
        }

        try {
            const { data } = await api.post('/api/auth/check-loginPw', {
                loginPw: form.password,
            });

            if (!data.ok) {
                raiseError(data.message, passwordRef);
            }
        } catch {
            raiseError('서버 연결에 실패했습니다.', passwordRef);
        }
    };

    const handleVerifyCode = async () => {
        if (!form.email) return raiseError('이메일을 입력하세요.', emailRef);
        if (!form.code) return raiseError('인증코드를 입력하세요.', codeRef);

        setIsSuccessMessage(false);
        setErrorMessage('');
        setVerifyingCode(true);

        try {
            const { data } = await api.post('/api/auth/verifyCode', {
                email: form.email,
                code: form.code,
            });

            if (!data?.ok) {
                setVerified(false);
                return raiseError(data?.message || '인증코드가 일치하지 않습니다.', codeRef);
            }

            setVerified(true);
            setIsSuccessMessage(true);
            setErrorMessage('인증이 완료되었습니다.');
            passwordRef.current?.focus();
        } catch {
            setVerified(false);
            return raiseError('서버 연결에 실패하였습니다.', codeRef);
        } finally {
            setVerifyingCode(false);
        }
    };

    const handleCheckNickname = async () => {
        if (!form.nickname) return;

        try {
            const { data } = await api.post('/api/auth/check-nickname', {
                nickName: form.nickname,
            });

            if (!data.ok) {
                raiseError(data.message, nicknameRef);
            } else {
                setIsSuccessMessage(true);
                setErrorMessage(data.message);
            }
        } catch {
            raiseError('서버 연결에 실패했습니다.', nicknameRef);
        }
    };

    const handleJoin = async () => {
        if (!form.email) return raiseError('이메일을 입력하세요', emailRef);
        if (!form.code) return raiseError('인증코드를 입력하세요', codeRef);

        if (!verified) return raiseError('이메일 인증을 완료하세요.', codeRef);
        if (!form.password) return raiseError('비밀번호를 입력하세요.', passwordRef);
        if (!form.passwordConfirm) return raiseError('비밀번호 확인을 입력하세요', passwordConfirmRef);
        if (!isValidPassword(form.password)) return raiseError('비밀번호는 8~16자리, 영문+숫자를 포함해야 합니다.', passwordRef);
        if (form.password !== form.passwordConfirm) return raiseError('비밀번호가 일치하지 않습니다.', passwordConfirmRef);
        if (!form.nickname) return raiseError('닉네임을 입력하세요.', nicknameRef);

        setIsSuccessMessage(false);
        setErrorMessage('');

        try {
            const { data } = await api.post('/api/auth/doJoin', {
                email: form.email,
                nickName: form.nickname,
                loginPw: form.password,
            });

            if (!data?.ok) {
                return raiseError(data?.message || '회원가입에 실패하였습니다.', nicknameRef);
            }

            alert('회원가입이 완료되었습니다!');
            navigate('/login');
        } catch {
            return raiseError('서버 연결에 실패하였습니다.', nicknameRef);
        }
    };

    return (
        <div className="login-form-wrap">
            <div
                className="login-form"
                style={{
                    width: 560,
                    padding: '56px 48px',
                    borderRadius: 18,
                    transform: 'translateY(40px)',
                    scale: 1.2,
                    position: 'relative',
                    zIndex: 20,
                    background: 'rgb(38,38,38)',
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
                            {sendingMail ? '전송중' : '인증'}
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
                        <SubButton onClick={handleVerifyCode} disabled={verifyingCode}>
                            {verifyingCode ? '확인중' : verified ? '완료' : '확인'}
                        </SubButton>
                    </div>
                </FormRow>

                <FormRow label="비밀번호">
                    <Input
                        ref={passwordRef}
                        type="password"
                        value={form.password}
                        onChange={update('password')}
                        onBlur={handleCheckPassword}
                        placeholder="비밀번호 (8~16자리, 숫자+영문)"
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
                    <Input
                        ref={nicknameRef}
                        value={form.nickname}
                        onChange={update('nickname')}
                        onBlur={handleCheckNickname}
                        placeholder="닉네임"
                    />
                </FormRow>

                <div style={{ position: 'relative', height: 20, marginTop: 6 }}>
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSuccessMessage ? '#6bff86' : '#ff6b6b',
                            fontSize: 13,
                            pointerEvents: 'none',
                            opacity: errorMessage ? 1 : 0,
                        }}
                    >
                        {errorMessage || '\u00A0'}
                    </div>
                </div>

                <div style={{ marginTop: 28, textAlign: 'center' }}>
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
            </div>
        </div>
    );
}

// ---------- 공통 컴포넌트 ----------

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
        </button>
    );
}
