from flask import Flask, request, jsonify
import librosa
import numpy as np
import tempfile
import os
from collections import deque, Counter

app = Flask(__name__)

# =========================
# 고정 규칙
# =========================
LANES = list(range(7))      # 0~6
SPACE = 3                   # SPACE lane
CHORD_EXCLUDE = {SPACE}     # ✅ 동시탭에서 SPACE 무조건 제외
EPS = 1e-6

# =========================
# 🔧 DB/정밀도 맞춤 (중요)
# =========================
TIME_DECIMALS = 3
DEBUG_DUP = True

# =========================
# 난이도 프리셋
# - post_long_gap: ✅ 롱 끝난 직후 같은 레인 탭 금지 시간(초)
# - chord_prob: ✅ 동시탭 빈도(전체적으로 낮춤)
# =========================
PRESET = {
    "easy": {
        "grid_div": 1,
        "keep": 0.33,
        "max_nps": 2.5,
        "min_tap_gap": 0.28,
        "chord_prob": 0.015,      # ✅ 더 낮춤
        "long_prob": 0.10,
        "long_min": 0.45, "long_max": 0.95,
        "long_cooldown": 1.10,
        "climax_boost": 1.15,
        "post_long_gap": 0.18,    # ✅ 롱 끝나고 0.18초는 같은 레인 탭 금지
    },
    "normal": {
        "grid_div": 2,
        "keep": 0.38,
        "max_nps": 3.2,
        "min_tap_gap": 0.22,
        "chord_prob": 0.020,      # ✅ 더 낮춤
        "long_prob": 0.12,
        "long_min": 0.50, "long_max": 1.10,
        "long_cooldown": 0.95,
        "climax_boost": 1.22,
        "post_long_gap": 0.18,
    },
    "hard": {
        "grid_div": 4,
        "keep": 0.50,
        "max_nps": 4.6,
        "min_tap_gap": 0.18,
        "chord_prob": 0.045,      # ✅ 더 낮춤
        "long_prob": 0.14,
        "long_min": 0.55, "long_max": 1.25,
        "long_cooldown": 0.85,
        "climax_boost": 1.30,
        "post_long_gap": 0.18,
    },
    "hell": {
        "grid_div": 6,
        "keep": 0.58,
        "max_nps": 5.4,
        "min_tap_gap": 0.16,
        "chord_prob": 0.060,      # ✅ 더 낮춤
        "long_prob": 0.16,
        "long_min": 0.60, "long_max": 1.35,
        "long_cooldown": 0.80,
        "climax_boost": 1.35,
        "post_long_gap": 0.18,
    },
}

# =========================
# 유틸
# =========================
def _safe_diff(s: str) -> str:
    s = (s or "normal").strip().lower()
    return s if s in PRESET else "normal"

def _clamp(x, a, b):
    return a if x < a else b if x > b else x

def _time_to_idx(t, sr, hop):
    return int(np.clip(round(t * sr / hop), 0, 10**12))

def _norm01(x):
    if len(x) == 0:
        return x
    mn, mx = float(np.min(x)), float(np.max(x))
    if mx - mn < 1e-9:
        return np.zeros_like(x, dtype=float)
    return (x - mn) / (mx - mn)

def _pick_lane(preferred, banned):
    cand = [l for l in preferred if l not in banned]
    if not cand:
        return None
    return int(np.random.choice(cand))

def _lane_order(center=SPACE):
    return sorted(LANES, key=lambda x: (abs(x - center), x))

def _rt(x: float) -> float:
    return float(round(x, TIME_DECIMALS))

# =========================
# 중복 제거
# =========================
def _dedup_notes(notes):
    notes.sort(key=lambda x: (x["time"], x["lane"], 0 if x["type"] == "tap" else 1))
    seen = set()
    out = []
    for n in notes:
        key = (
            int(n["lane"]),
            float(n["time"]),
            n["type"],
            float(n["endTime"]) if n.get("endTime") is not None else None
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(n)
    return out

def _debug_dup(notes, tag="AFTER_DEDUP"):
    if not DEBUG_DUP:
        return
    ctr = Counter((n["lane"], n["time"], n["type"], n.get("endTime")) for n in notes)
    dups = [(k, v) for k, v in ctr.items() if v > 1]
    print(f"[{tag}] total={len(notes)} dup_keys={len(dups)}")
    if dups:
        print(f"[{tag}] sample_dup={dups[:10]}")

# =========================
# 핵심 생성기
# =========================
def generate_notes(audio_path: str, diff: str):
    cfg = PRESET[diff]

    y, sr = librosa.load(audio_path, sr=None, mono=True)
    if y is None or len(y) < sr:
        return [], 0.0

    duration = float(librosa.get_duration(y=y, sr=sr))

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, start_bpm=120)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    if beat_times is None or len(beat_times) < 8:
        bpm = float(tempo) if tempo and tempo > 0 else 120.0
        beat_sec = 60.0 / bpm
        beat_times = np.arange(0.0, duration, beat_sec)

    hop = 512
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    onset_env = _norm01(onset_env)
    rms = _norm01(rms)

    grid_div = int(cfg["grid_div"])
    grid_times = []
    for i in range(len(beat_times) - 1):
        a = float(beat_times[i])
        b = float(beat_times[i + 1])
        if b <= a + 0.02:
            continue
        step = (b - a) / grid_div
        for k in range(grid_div):
            t = a + k * step
            if 0.0 <= t <= duration - 0.05:
                grid_times.append(t)

    if len(beat_times) >= 2:
        tail_step = float(beat_times[-1] - beat_times[-2]) / grid_div
        t = float(beat_times[-1])
        for k in range(grid_div):
            tt = t + k * tail_step
            if tt <= duration - 0.05:
                grid_times.append(tt)

    grid_times = sorted({_rt(float(t)) for t in grid_times})
    if not grid_times:
        return [], duration

    occupied_until = {l: -1e9 for l in LANES}   # ✅ tap/long 모두 점유 끝 시각(롱은 post_long_gap 포함)
    last_tap_time = {l: -1e9 for l in LANES}
    last_long_time = -1e9

    win = 1.0
    recent_times = deque()
    notes = []

    np.random.seed(42)

    climax_start = duration * 0.85
    lane_pref = _lane_order(center=SPACE)

    TAP_OCC = 0.12
    POST_LONG_GAP = float(cfg.get("post_long_gap", 0.12))  # ✅ 롱 후 여유

    def can_place_tap(lane, time):
        if (time - last_tap_time[lane]) < cfg["min_tap_gap"] - EPS:
            return False
        # ✅ 롱 끝난 직후 탭도 막기(occupied_until에 post_long_gap 반영됨)
        if time < occupied_until[lane] - EPS:
            return False
        return True

    def can_place_long(lane, time, end_time):
        if time < occupied_until[lane] - EPS:
            return False
        if end_time <= time + 0.12:
            return False
        return True

    for t in grid_times:
        while recent_times and recent_times[0] < t - win:
            recent_times.popleft()

        in_climax = (t >= climax_start)
        keep = cfg["keep"] * (cfg["climax_boost"] if in_climax else 1.0)
        max_nps = cfg["max_nps"] * (1.12 if in_climax else 1.0)

        if len(recent_times) >= max_nps - EPS:
            continue

        idx = _time_to_idx(t, sr, hop)
        if idx >= len(onset_env):
            idx = len(onset_env) - 1

        o = float(onset_env[idx])
        e = float(rms[idx])

        strength = 0.65 * o + 0.35 * e
        gate = _clamp(keep + 0.35 * strength, 0.0, 0.95)

        if np.random.rand() > gate:
            continue

        # 타입 결정
        want_long = False
        if (t - last_long_time) >= cfg["long_cooldown"]:
            long_bias = cfg["long_prob"] + 0.18 * e - 0.10 * o
            if in_climax:
                long_bias *= 0.92
            long_bias = _clamp(long_bias, 0.02, 0.35)
            want_long = (np.random.rand() < long_bias)

        # 레인 선택
        lane = None
        chosen_end = None

        for _ in range(24):
            cand = _pick_lane(lane_pref, banned=set())
            if cand is None:
                break

            if want_long:
                length = float(np.random.uniform(cfg["long_min"], cfg["long_max"]))
                end_t = _rt(min(duration - 0.02, t + length))
                if can_place_long(cand, t, end_t):
                    lane = cand
                    chosen_end = end_t
                    break
            else:
                if can_place_tap(cand, t):
                    lane = cand
                    break

        if lane is None:
            continue

        # 1개 노트 확정
        if want_long:
            end_t = chosen_end
            if end_t is None:
                length = float(np.random.uniform(cfg["long_min"], cfg["long_max"]))
                end_t = _rt(min(duration - 0.02, t + length))

            if not can_place_long(lane, t, end_t):
                continue

            notes.append({
                "lane": int(lane),
                "time": _rt(t),
                "type": "long",
                "endTime": _rt(end_t),
            })

            # ✅ 롱 끝 + post_long_gap 만큼 같은 레인 탭 금지
            occupied_until[lane] = end_t + POST_LONG_GAP
            last_long_time = t
            recent_times.append(t)

        else:
            notes.append({
                "lane": int(lane),
                "time": _rt(t),
                "type": "tap",
            })
            occupied_until[lane] = max(occupied_until[lane], t + TAP_OCC)
            last_tap_time[lane] = t
            recent_times.append(t)

        # =========================
        # 동시탭(최대 2개)
        # 1) SPACE 제외는 구조적으로 강제
        # 2) 빈도 자체 낮춤 + 에너지 기반으로만 약간 가중(남발 방지)
        # =========================
        chord_p = float(cfg["chord_prob"])
        # ✅ 강세/에너지 있을 때만 조금 올라가게(하지만 과하지 않게)
        chord_gate = _clamp(chord_p * (0.65 + 0.35 * strength), 0.0, chord_p * 1.15)

        if np.random.rand() < chord_gate:
            # long 위에는 chord 더 안 얹음
            if want_long and np.random.rand() < 0.70:
                continue

            # ✅ SPACE 무조건 제외 + 이미 쓴 lane 제외
            banned = set(CHORD_EXCLUDE) | {lane}

            chord_candidates = [l for l in LANES if l not in banned]
            if not chord_candidates:
                continue

            chord_pref = sorted(
                chord_candidates,
                key=lambda x: (abs(x - lane) < 2, abs(x - SPACE), x)
            )

            chord_lane = None
            for _ in range(24):
                cand2 = _pick_lane(chord_pref, banned=set())
                if cand2 is None:
                    break
                # ✅ tap만
                if can_place_tap(cand2, t):
                    chord_lane = cand2
                    break

            if chord_lane is not None:
                notes.append({
                    "lane": int(chord_lane),
                    "time": _rt(t),
                    "type": "tap",
                })
                occupied_until[chord_lane] = max(occupied_until[chord_lane], t + TAP_OCC)
                last_tap_time[chord_lane] = t
                # 동시 2개 카운트 반영
                if len(recent_times) < max_nps - EPS:
                    recent_times.append(t)

    notes = _dedup_notes(notes)
    _debug_dup(notes, "AFTER_DEDUP")
    return notes, duration

# =========================
# API
# =========================
@app.get("/health")
def health():
    return jsonify({"ok": True})

@app.post("/analyze")
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    f = request.files["file"]
    diff = _safe_diff(request.form.get("diff") or request.args.get("diff"))

    suffix = os.path.splitext(f.filename or "")[1]
    if suffix.lower() not in [".mp3", ".wav", ".ogg", ".flac", ".m4a"]:
        suffix = ".mp3"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_path = tmp.name
    tmp.close()
    f.save(tmp_path)

    try:
        notes, duration = generate_notes(tmp_path, diff)
        return jsonify({
            "diff": diff,
            "duration": float(round(duration, 3)),
            "noteCount": len(notes),
            "notes": notes
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.remove(tmp_path)
        except:
            pass

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
