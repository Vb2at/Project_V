import React from 'react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // axios 사용

// axios 인스턴스 생성
const api = axios.create({
    baseURL: 'http://localhost:8080', // 스프링 포트
    withCredentials: true,  // 세션쓰는 경우 켜두는게 좋음
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
    const [isSuccessMessage, setIsSuccessMessage] = useState(false); // 메시지 색상 제어(성공=초록, 실패=빨강)
    const [sendingMail, setSendingMail] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false); // 인증코드 확인 로딩
    const [verified, setVerified] = useState(false); // 이메일 인증 완료 여부

    // ref (포커스 제어)
    const passwordRef = useRef(null);
    const passwordConfirmRef = useRef(null);
    const nicknameRef = useRef(null);
    const emailRef = useRef(null);
    const codeRef = useRef(null);

    const update = (key) => (e) => {
        // 이메일 변경 시 인증 상태 초기화
        if (key === 'email') {
            setVerified(false);
            setForm((f) => ({ ...f, email: e.target.value, code: '' })); // 이메일 바꾸면 인증코드 초기화
            return;
        }

        setForm((f) => ({ ...f, [key]: e.target.value }));
    };

    //공통 에러 처리 유틸
    const raiseError = (msg, ref) => {
        setIsSuccessMessage(false); // 에러는 무조건 빨강
        setErrorMessage(msg);
        ref?.current?.focus();
        ref?.current?.classList.add('is-error');
        setTimeout(() => ref?.current?.classList.remove('is-error'), 300);
    };

    //이메일 인증코드 발송 (Spring 연동)
    //POST /api/auth/sendCode
    const handleSendMail = async () => {
        if (!form.email) {
            return raiseError('이메일을 입력하세요.', emailRef);
        }

        setIsSuccessMessage(false); // 로딩 시작 시 메시지는 기본 빨강 상태로
        setErrorMessage('');
        setSendingMail(true);

        try {
            // 이메일 중복 체크 API 호출
            const emailCheck = await api.post('/api/auth/check-email', {
                email: form.email,
            });

            if (!emailCheck.data?.ok) {
                return raiseError(emailCheck.data.message, emailRef);
            }

            // 인증코드 발송 API 호출
            const { data } = await api.post('/api/auth/sendCode', {
                email: form.email,  // 서버 CheckReq 키 이름 맞춤
            });

            if (!data?.ok) {
                return raiseError(data?.message || '인증코드 발송에 실패하였습니다.', emailRef);
            }

            // 발송 성공 메시지(초록)
            setIsSuccessMessage(true);
            setErrorMessage('인증코드를 발송했습니다.');

            // 발송 성공 시 포커스 이동
            codeRef.current?.focus();
        } catch (e) {
            return raiseError('서버 연결에 실패하였습니다.', emailRef);
        } finally {
            setSendingMail(false);
        }
    };

    //비밀번호 검증 (Spring 연동)
    //POST /api/auth/check-loginPw
    const handleCheckPassword = async () => {
        if (!form.password) return;

        try {
            const { data } = await api.post('/api/auth/check-loginPw', {
                loginPw: form.password, //CheckReq.loginPw
            });

            if (!data.ok) {
                raiseError(data.message, passwordRef);
            }
        } catch (e) {
            raiseError('서버 연결에 실패했습니다.', passwordRef);
        }
    };

    //이메일 인증코드 확인 (Spring 연동)
    //POST /api/auth/verifyCode
    const handleVerifyCode = async () => {
        if (!form.email) return raiseError('이메일을 입력하세요.', emailRef);
        if (!form.code) return raiseError('인증코드를 입력하세요.', codeRef);

        setIsSuccessMessage(false); // 시도 시작 시 기본 빨강
        setErrorMessage('');
        setVerifyingCode(true);

        try {
            const { data } = await api.post('/api/auth/verifyCode', {
                email: form.email,  //서버 CheckReq 키 이름 맞춤 email
                code: form.code,    //서버 CheckReq 키 이름 맞춤 code
            });

            if (!data?.ok) {
                setVerified(false);
                return raiseError(data?.message || '인증코드가 일치하지 않습니다.', codeRef);
            }
            //인증 성공
            setVerified(true);

            // 인증 성공 메시지(초록)
            setIsSuccessMessage(true);
            setErrorMessage('인증이 완료되었습니다.');

            passwordRef.current?.focus();
        } catch (e) {
            setVerified(false);
            return raiseError('서버 연결에 실패하였습니다.', codeRef);
        } finally {
            setVerifyingCode(false);
        }
    };

    //닉네임 중복체크 (Spring 연동)
    //POST /api/auth/check-nickname
    const handleCheckNickname = async () => {
        if (!form.nickname) return;

        try {
            const { data } = await api.post('/api/auth/check-nickname', {
                nickName: form.nickname, //CheckReq.nickName
            });

            if (!data.ok) {
                raiseError(data.message, nicknameRef);
            } else {
                setIsSuccessMessage(true); // 성공 메시지는초록
                setErrorMessage(data.message);
            }
        } catch (e) {
            raiseError('서버 연결에 실패했습니다.', nicknameRef);
        }
    };

    //회원가입 (Spring 연동)
    //Post /api/auth/doJoin
    const handleJoin = async () => {
        if (!form.email) return raiseError('이메일을 입력하세요', emailRef);
        if (!form.code) return raiseError('인증코드를 입력하세요', codeRef);

        //스프링에서도 체크하지만 UX차원에서 먼저 막기
        if (!verified) return raiseError('이메일 인증을 완료하세요.', codeRef);
        if (!form.password) return raiseError('비밀번호를 입력하세요.', passwordRef);
        if (!form.passwordConfirm) return raiseError('비밀번호 확인을 입력하세요', passwordConfirmRef);
        if (form.password !== form.passwordConfirm) return raiseError('비밀번호가 일치하지 않습니다.', passwordConfirmRef);
        if (!form.nickname) return raiseError('닉네임을 입력하세요.', nicknameRef);

        setIsSuccessMessage(false); // 시도 시작 시 기본 빨강
        setErrorMessage('');

        try {
            const { data } = await api.post('/api/auth/doJoin', {
                email: form.email,  //CheckReq.email
                nickName: form.nickname, //CheckReq.nickName
                loginPw: form.password, //CheckReq.loginPw
            });

            if (!data?.ok) {
                return raiseError(data?.message || '회원가입에 실패하였습니다.', nicknameRef);
            }

            console.log('Join success', form);

            alert('회원가입이 완료되었습니다!');
            // 로그인 페이지 이동
            navigate('/login');
        } catch (e) {
            return raiseError('서버 연결에 실패하였습니다.', nicknameRef);
        }
    };

    return (
        <>
            {/* ===== 카드 ===== */}
            <div
                style={{
                    width: 560,
                    padding: '48px 40px',
                    borderRadius: 18,
                    transform: 'translateY(40px)',
                    scale: 1.2,
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
                        {/* 확인 버튼에 onclick 연결 + 로딩/인증상태 표시 */}
                        <SubButton onClick={handleVerifyCode} disabled={verifyingCode}>
                            {verifyingCode ? (
                                <span className="loading loading-spinner loading-sm" style={{ color: '#fff' }} />
                            ) : verified ? (
                                '완료'
                            ) : (
                                '확인'
                            )}
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
                    <Input
                        ref={nicknameRef}
                        value={form.nickname}
                        onChange={update('nickname')}
                        onBlur={handleCheckNickname}
                        placeholder="닉네임"
                    />
                </FormRow>

                {/*에러 메시지 공간 고정 */}
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
                            color: isSuccessMessage ? '#6bff86' : '#ff6b6b',    // 성공=초록 / 실패=빨강
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
                        transform: 'translateY(100px)',
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

//공통 컴포넌트

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
