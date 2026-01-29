import { createPortal } from 'react-dom';

export default function SettingsModal({
    open,
    settings,
    onChange,
    onApply,
    onClose,
    onReset,
}) {
    if (!open) return null;

    const update = (patch) => onChange({ ...settings, ...patch });

    return createPortal(
        <div style={overlay} onClick={onClose}>
            <div style={modal} onClick={(e) => e.stopPropagation()}>

                <h2 style={{ marginBottom: 12, color: '#5aeaff' }}>설정</h2>

                {/* ===== 사운드 ===== */}
                <Section title="사운드">
                    <Slider
                        label="BGM 볼륨"
                        value={settings.bgmVolume}
                        onChange={(v) => update({ bgmVolume: v })}
                    />
                    <Slider
                        label="미리듣기 볼륨"
                        value={settings.previewVolume}
                        onChange={(v) => update({ previewVolume: v })}
                    />
                    <Slider
                        label="효과음 볼륨"
                        value={settings.sfxVolume}
                        onChange={(v) => update({ sfxVolume: v })}
                    />
                    <Toggle
                        label="히트 사운드"
                        value={settings.hitSound}
                        onChange={(v) => update({ hitSound: v })}
                    />
                </Section>

                {/* ===== 노트 스타일 ===== */}
                <Section title="노트 스타일">
                    <Color
                        label="탭 노트 색상"
                        value={settings.tapNoteColor}
                        onChange={(v) => update({ tapNoteColor: v })}
                    />
                    <Color
                        label="롱 노트 색상"
                        value={settings.longNoteColor}
                        onChange={(v) => update({ longNoteColor: v })}
                    />
                </Section>

                {/* ===== 성능 ===== */}
                <Section title="성능">
                    <Select
                        label="FPS 제한"
                        value={settings.fps}
                        options={[30, 45, 60]}
                        onChange={(v) => update({ fps: v })}
                    />

                    <Toggle
                        label="저사양 모드 (이펙트/텍스트 간소화)"
                        value={settings.lowEffect}
                        onChange={(v) => {
                            update({
                                lowEffect: v,
                                hitEffect: v ? false : settings.hitEffect,
                                visualizer: v ? false : settings.visualizer,
                                judgeText: v ? false : settings.judgeText,
                                comboText: v ? false : settings.comboText,
                            });
                        }}
                    />

                    <Toggle
                        label="히트 이펙트"
                        value={settings.hitEffect}
                        onChange={(v) => update({ hitEffect: v })}
                    />
                    <Toggle
                        label="판정 텍스트"
                        value={settings.judgeText}
                        onChange={(v) => update({ judgeText: v })}
                    />
                    <Toggle
                        label="콤보 텍스트"
                        value={settings.comboText}
                        onChange={(v) => update({ comboText: v })}
                    />
                    <Toggle
                        label="비주얼라이저"
                        value={settings.visualizer}
                        onChange={(v) => update({ visualizer: v })}
                    />
                </Section>

                {/* ===== 버튼 ===== */}
                <div style={btnRow}>
                    <button style={btn} onClick={onReset}>기본값 복원</button>
                    <div style={{ flex: 1 }} />
                    <button style={btn} onClick={onClose}>취소</button>
                    <button style={btnPrimary} onClick={onApply}>적용</button>
                </div>

            </div>
        </div>,
        document.body
    );
}

/* ================== UI PARTS ================== */

function Section({ title, children }) {
    return (
        <div style={section}>
            <div style={sectionTitle}>{title}</div>
            {children}
        </div>
    );
}

function Toggle({ label, value, onChange }) {
    return (
        <div style={row}>
            <span>{label}</span>
            <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
            />
        </div>
    );
}

function Slider({ label, value, onChange }) {
    return (
        <div style={row}>
            <span>{label}</span>
            <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
            <span style={{ width: 36, textAlign: 'right' }}>{value}</span>
        </div>
    );
}

function Color({ label, value, onChange }) {
    if (typeof value !== 'number') return null;

    const hex = `#${value.toString(16).padStart(6, '0')}`;

    return (
        <div style={row}>
            <span>{label}</span>
            <input
                type="color"
                value={hex}
                onChange={(e) => {
                    const num = parseInt(e.target.value.slice(1), 16);
                    onChange(num);
                }}
            />
        </div>
    );
}



function Select({ label, value, options, onChange }) {
    return (
        <div style={row}>
            <span>{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            >
                {options.map((v) => (
                    <option key={v} value={v}>{v}</option>
                ))}
            </select>
        </div>
    );
}

/* ================== STYLES ================== */

const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
};

const modal = {
    width: 420,
    background: 'rgba(10,20,30,0.95)',
    border: '2px solid rgba(90,234,255,0.5)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
};

const section = {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const sectionTitle = {
    fontWeight: 600,
    marginBottom: 6,
    color: '#5aeaff',
};

const row = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
};

const btnRow = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
};

const btn = {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(90,234,255,0.5)',
    background: 'transparent',
    color: '#5aeaff',
    cursor: 'pointer',
};

const btnPrimary = {
    padding: '6px 16px',
    borderRadius: 8,
    border: '1.5px solid #5aeaff',
    background: 'rgba(10,20,30,0.9)',
    color: '#5aeaff',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: `
    0 0 6px rgba(90,234,255,0.6),
    inset 0 0 6px rgba(90,234,255,0.25)
  `,
};
