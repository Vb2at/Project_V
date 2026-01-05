from flask import Flask, request, jsonify
import librosa
import numpy as np
import os, tempfile
from collections import deque

app = Flask(__name__)

SPACE_LANE = 3

# ====== 전역 튜닝 ======
GLOBAL_OFFSET = -0.096
SEED = 42

# ✅ easy 체감 제어(핵심)
MAX_NPS_EASY = 2.2     # easy: 1초에 최대 2~3개 정도 (2.0~2.8 사이 튜닝)
EASY_KEEP = 0.30       # easy: onset 유지 확률 (0.20~0.45 사이 튜닝)

PRESET = {
    "easy": {
        "HARD_PCT": 87, "VERY_HARD_PCT": 93,
        "SUBDIV_HARD": 1, "SUBDIV_VERY_HARD": 1,

        # ✅ easy는 여기서 확실히 벌려야 함
        "MIN_GAP_EASY": 0.22, "MIN_GAP_HARD": 0.18, "MIN_GAP_VERY_HARD": 0.16,

        "CHORD_PROB_EASY": 0.02, "CHORD_PROB_HARD": 0.028, "CHORD_PROB_VERY_HARD": 0.03,
        "CHORD_MIN_DIST": 2,
        "LONG_THR_PCT": 45, "LONG_MIN_SEC": 0.7, "LONG_SNAP_MIN_SEC": 0.35,
        "JUMP_STRENGTH_EASY": 0.25, "JUMP_STRENGTH_HARD": 0.4, "JUMP_STRENGTH_VERY_HARD": 0.45,
    },
    "normal": {
        "HARD_PCT": 50, "VERY_HARD_PCT": 70,
        "SUBDIV_HARD": 2, "SUBDIV_VERY_HARD": 2,
        "MIN_GAP_EASY": 0.08, "MIN_GAP_HARD": 0.07, "MIN_GAP_VERY_HARD": 0.07,
        "CHORD_PROB_EASY": 0.02, "CHORD_PROB_HARD": 0.03, "CHORD_PROB_VERY_HARD": 0.04,
        "CHORD_MIN_DIST": 2,
        "LONG_THR_PCT": 53, "LONG_MIN_SEC": 0.45, "LONG_SNAP_MIN_SEC": 0.35,
        "JUMP_STRENGTH_EASY": 0.5, "JUMP_STRENGTH_HARD": 0.6, "JUMP_STRENGTH_VERY_HARD": 0.6,
    },
    "hard": {
        "HARD_PCT": 35, "VERY_HARD_PCT": 40,
        "SUBDIV_HARD": 2, "SUBDIV_VERY_HARD": 2,
        "MIN_GAP_EASY": 0.07, "MIN_GAP_HARD": 0.06, "MIN_GAP_VERY_HARD": 0.06,
        "CHORD_PROB_EASY": 0.025, "CHORD_PROB_HARD": 0.035, "CHORD_PROB_VERY_HARD": 0.04,
        "CHORD_MIN_DIST": 3,
        "LONG_THR_PCT": 55, "LONG_MIN_SEC": 0.3, "LONG_SNAP_MIN_SEC": 0.35,
        "JUMP_STRENGTH_EASY": 0.7, "JUMP_STRENGTH_HARD": 0.8, "JUMP_STRENGTH_VERY_HARD": 0.8,
    },
}

def apply_preset(diff: str):
    diff = (diff or "easy").lower()
    cfg = PRESET.get(diff, PRESET["easy"])
    globals().update(cfg)
    return diff

def clamp_time(t: float) -> float:
    return 0.0 if t < 0.0 else t

def make_subgrid(beat_times: np.ndarray, subdiv: int) -> np.ndarray:
    if beat_times is None or len(beat_times) < 2:
        return beat_times
    grid = []
    for i in range(len(beat_times) - 1):
        a, b = float(beat_times[i]), float(beat_times[i + 1])
        for k in range(subdiv):
            grid.append(a + (b - a) * (k / subdiv))
    grid.append(float(beat_times[-1]))
    return np.array(grid, dtype=float)

def snap_to_grid(t: float, grid: np.ndarray) -> float:
    if grid is None or len(grid) == 0:
        return t
    idx = int(np.argmin(np.abs(grid - t)))
    return float(grid[idx])

def cap_by_nps(times: list[float], max_nps: float) -> list[float]:
    """
    times(정렬됨)에서 1초 윈도우 기준 초당 최대 노트 수 제한.
    max_nps=2.2면 1초에 2개 정도 유지되도록 강하게 제한됨.
    """
    if not times:
        return times
    max_cnt = max(1, int(np.floor(max_nps)))  # 2.2 -> 2
    q = deque()
    out = []
    for t in times:
        while q and (t - q[0]) > 1.0:
            q.popleft()
        if len(q) >= max_cnt:
            continue
        out.append(t)
        q.append(t)
    return out

@app.route("/analyze", methods=["POST"])
def analyze():
    file = request.files["file"]

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    tmp_path = tmp.name
    tmp.close()
    file.save(tmp_path)

    diff = request.form.get("diff", "easy")
    print("DIFF =", diff)
    diff = apply_preset(diff)
    rng = np.random.default_rng(SEED) if SEED is not None else np.random.default_rng()

    try:
        y, sr = librosa.load(tmp_path, sr=None, mono=True)

        # ===== 1) 박자(beat) 추출 =====
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        if beat_times is None or len(beat_times) < 2:
            duration = float(librosa.get_duration(y=y, sr=sr))
            beat_times = np.arange(0.0, duration, 0.5, dtype=float)

        beat_times = np.array(beat_times, dtype=float)

        # ===== 2) onset(타격점) 추출 =====
        onset_frames = librosa.onset.onset_detect(
            y=y, sr=sr,
            backtrack=False
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)

        # ===== 3) RMS sustain -> long 후보 + 에너지 맵 =====
        hop = 512
        rms = librosa.feature.rms(y=y, hop_length=hop)[0]
        rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)

        win = 6
        rms_smooth = np.convolve(rms, np.ones(win) / win, mode="same")

        hard_thr = float(np.percentile(rms_smooth, HARD_PCT))
        very_hard_thr = float(np.percentile(rms_smooth, VERY_HARD_PCT))

        def energy_level(t: float) -> str:
            i = int(np.argmin(np.abs(rms_times - t)))
            e = float(rms_smooth[i])
            if e >= very_hard_thr:
                return "very_hard"
            if e >= hard_thr:
                return "hard"
            return "easy"

        # 롱노트 후보
        thr_long = float(np.percentile(rms, LONG_THR_PCT))
        mask = rms >= thr_long

        long_segments = []
        start = None
        for i, m in enumerate(mask):
            if m and start is None:
                start = i
            if (not m or i == len(mask) - 1) and start is not None:
                end = i if not m else i
                t0 = float(rms_times[start])
                t1 = float(rms_times[end])
                if t1 - t0 >= LONG_MIN_SEC:
                    long_segments.append((t0, t1))
                start = None

        # ===== 4) 스냅 그리드 준비 =====
        grid_easy = beat_times
        grid_hard = make_subgrid(beat_times, SUBDIV_HARD)
        grid_very_hard = make_subgrid(beat_times, SUBDIV_VERY_HARD)

        # ✅ easy는 에너지 기반 업을 끔: 항상 기본 비트 그리드만
        def snap_time_by_energy(t: float) -> float:
            if diff == "easy":
                return snap_to_grid(t, grid_easy)
            lv = energy_level(t)
            if lv == "very_hard":
                return snap_to_grid(t, grid_very_hard)
            if lv == "hard":
                return snap_to_grid(t, grid_hard)
            return snap_to_grid(t, grid_easy)

        # 롱 스냅
        snapped_longs = []
        for (t0, t1) in long_segments:
            s = snap_time_by_energy(t0)
            e = snap_time_by_energy(t1)
            if e - s >= LONG_SNAP_MIN_SEC:
                snapped_longs.append((s, e))

        def in_any_long(t: float) -> bool:
            for s, e in snapped_longs:
                if s <= t <= e:
                    return True
            return False

        # onset 스냅
        snapped_onsets = [snap_time_by_energy(float(t)) for t in onset_times]
        snapped_onsets.sort()

        # min_gap 적용 (easy면 항상 MIN_GAP_EASY)
        filtered_onsets = []
        last = -1e9
        for t in snapped_onsets:
            lv = "easy" if diff == "easy" else energy_level(t)
            gap = MIN_GAP_EASY if lv == "easy" else (MIN_GAP_HARD if lv == "hard" else MIN_GAP_VERY_HARD)
            if t - last >= gap:
                filtered_onsets.append(t)
                last = t

        # 롱 구간 안 탭 제거
        filtered_onsets = [t for t in filtered_onsets if not in_any_long(t)]

        # 정밀 중복 제거(스냅으로 같은 값 많이 생김)
        filtered_onsets = [round(float(t), 3) for t in filtered_onsets]
        filtered_onsets.sort()
        dedup = []
        last_t = None
        for t in filtered_onsets:
            if last_t is None or t != last_t:
                dedup.append(t)
                last_t = t
        filtered_onsets = dedup

        # ===== 5.5) diff별 밀도 =====
        if diff == "easy":
            # ✅ 1) 랜덤 드랍
            filtered_onsets = [t for t in filtered_onsets if rng.random() < EASY_KEEP]
            filtered_onsets.sort()

            # ✅ 2) 초당 최대 노트수 제한 (구간 몰림을 강제로 풀어줌)
            filtered_onsets = cap_by_nps(filtered_onsets, MAX_NPS_EASY)

        elif diff == "hard":
            # hard는 very_hard grid에서 추가 (기존 유지)
            extra = []
            onset_np = np.array(filtered_onsets, dtype=float) if filtered_onsets else np.array([], dtype=float)

            for tg in grid_very_hard:
                tg = float(tg)
                if energy_level(tg) != "very_hard":
                    continue
                if in_any_long(tg):
                    continue
                if onset_np.size > 0 and np.min(np.abs(onset_np - tg)) < MIN_GAP_VERY_HARD:
                    continue
                if rng.random() < 0.25:
                    extra.append(round(tg, 3))
                    onset_np = np.append(onset_np, tg)

            if extra:
                filtered_onsets = sorted(filtered_onsets + extra)

        # ===== 6) lane 배치 + 동시노트 =====
        notes = []
        last_lane = None

        def pick_lane(lv: str) -> int:
            nonlocal last_lane
            lanes = np.arange(7)

            if last_lane is None:
                lane = int(rng.integers(0, 7))
                last_lane = lane
                return lane

            dist = np.abs(lanes - last_lane)
            dist = np.minimum(dist, 7 - dist)

            close_w = 1.0 / (dist + 1.0)
            jump_w = (dist + 1.0)

            if lv == "very_hard":
                alpha = JUMP_STRENGTH_VERY_HARD
            elif lv == "hard":
                alpha = JUMP_STRENGTH_HARD
            else:
                alpha = JUMP_STRENGTH_EASY

            weights = (1.0 - alpha) * close_w + alpha * jump_w

            # 연속 같은 lane 금지
            weights[last_lane] = 0.0
            weights = weights / weights.sum()

            lane = int(rng.choice(lanes, p=weights))
            last_lane = lane
            return lane

        def pick_lane_far_from(base_lane: int) -> int:
            candidates = [
                i for i in range(7)
                if i != base_lane
                and i != SPACE_LANE
                and abs(i - base_lane) >= CHORD_MIN_DIST
            ]
            if candidates:
                return int(rng.choice(candidates))
            return int((base_lane + 3) % 7)

        # ✅ easy는 동시노트 금지
        def chord_prob(lv: str) -> float:
            if diff == "easy":
                return 0.0
            if lv == "very_hard":
                return CHORD_PROB_VERY_HARD
            if lv == "hard":
                return CHORD_PROB_HARD
            return CHORD_PROB_EASY

        # long 추가
        for (s, e) in snapped_longs:
            lv = "easy" if diff == "easy" else energy_level(s)
            lane = pick_lane(lv)

            st = clamp_time(float(s) + GLOBAL_OFFSET)
            et = clamp_time(float(e) + GLOBAL_OFFSET)

            notes.append({
                "time": round(st, 3),
                "lane": lane,
                "type": "long",
                "endTime": round(et, 3)
            })

        # tap 추가
        for t in filtered_onsets:
            lv = "easy" if diff == "easy" else energy_level(t)
            lane1 = pick_lane(lv)

            tt = clamp_time(float(t) + GLOBAL_OFFSET)

            notes.append({
                "time": round(tt, 3),
                "lane": lane1,
                "type": "tap",
                "endTime": None
            })

            if lane1 != SPACE_LANE and rng.random() < chord_prob(lv):
                lane2 = pick_lane_far_from(lane1)
                notes.append({
                    "time": round(tt, 3),
                    "lane": lane2,
                    "type": "tap",
                    "endTime": None
                })

        notes.sort(key=lambda n: n["time"])

        return jsonify({
            "difficulty": diff,
            "tempo": float(np.atleast_1d(tempo)[0]),
            "noteCount": len(notes),
            "notes": notes
        })

    finally:
        try:
            os.remove(tmp_path)
        except:
            pass

if __name__ == "__main__":
    app.run(port=5000)
