from flask import Flask, request, jsonify
import librosa
import numpy as np
import os, tempfile
from collections import deque, defaultdict

print("APP.PY PATH =", os.path.abspath(__file__))

app = Flask(__name__)

# =========================
# 고정 규칙
# =========================
LANES = list(range(7))      # 0~6
SPACE_LANE = 3
CHORD_EXCLUDE = {SPACE_LANE}  # ✅ 동시노트에서 SPACE 제외
EPS = 1e-9

# 겹침 판정 여유(초) : 렌더/판정 오차 흡수
OCC_EPS = 0.06

# ====== 전역 튜닝 ======
GLOBAL_OFFSET = -0.096
SEED = 42

# ✅ easy 체감 제어(핵심)
MAX_NPS_EASY = 2.2     # easy: 1초에 최대 2~3개 정도
EASY_KEEP = 0.30       # easy: onset 유지 확률

# =========================
# 난이도 프리셋
# =========================
PRESET = {
    "easy": {
        "HARD_PCT": 87, "VERY_HARD_PCT": 93,
        "SUBDIV_HARD": 1, "SUBDIV_VERY_HARD": 1,
        "MIN_GAP_EASY": 0.22, "MIN_GAP_HARD": 0.18, "MIN_GAP_VERY_HARD": 0.16,
        "CHORD_PROB_EASY": 0.0, "CHORD_PROB_HARD": 0.005, "CHORD_PROB_VERY_HARD": 0.008,
        "CHORD_MIN_DIST": 2,
        "LONG_THR_PCT": 45, "LONG_MIN_SEC": 0.7, "LONG_SNAP_MIN_SEC": 0.35,
        "JUMP_STRENGTH_EASY": 0.25, "JUMP_STRENGTH_HARD": 0.4, "JUMP_STRENGTH_VERY_HARD": 0.45,
    },
    "normal": {
        "HARD_PCT": 67, "VERY_HARD_PCT": 73,
        "SUBDIV_HARD": 2, "SUBDIV_VERY_HARD": 2,
        "MIN_GAP_EASY": 0.12, "MIN_GAP_HARD": 0.10, "MIN_GAP_VERY_HARD": 0.10,
        "CHORD_PROB_EASY": 0.005, "CHORD_PROB_HARD": 0.01, "CHORD_PROB_VERY_HARD": 0.015,
        "CHORD_MIN_DIST": 2,
        "LONG_THR_PCT": 58, "LONG_MIN_SEC": 0.45, "LONG_SNAP_MIN_SEC": 0.35,
        "JUMP_STRENGTH_EASY": 0.5, "JUMP_STRENGTH_HARD": 0.6, "JUMP_STRENGTH_VERY_HARD": 0.6,
    },
    "hard": {
        "HARD_PCT": 47, "VERY_HARD_PCT": 53,
        "SUBDIV_HARD": 2, "SUBDIV_VERY_HARD": 2,
        "MIN_GAP_EASY": 0.085, "MIN_GAP_HARD": 0.065, "MIN_GAP_VERY_HARD": 0.065,
        "CHORD_PROB_EASY": 0.015, "CHORD_PROB_HARD": 0.028, "CHORD_PROB_VERY_HARD": 0.029,
        "CHORD_MIN_DIST": 3,
        "LONG_THR_PCT": 55, "LONG_MIN_SEC": 0.30, "LONG_SNAP_MIN_SEC": 0.35,
        "JUMP_STRENGTH_EASY": 0.7, "JUMP_STRENGTH_HARD": 0.8, "JUMP_STRENGTH_VERY_HARD": 0.8,
    },
    "hell": {
        "HARD_PCT": 40, "VERY_HARD_PCT": 48,
        "SUBDIV_HARD": 4, "SUBDIV_VERY_HARD": 4,   # 더 촘촘 (16비트 느낌)
        "MIN_GAP_EASY": 0.070, "MIN_GAP_HARD": 0.055, "MIN_GAP_VERY_HARD": 0.050,
        "CHORD_PROB_EASY": 0.020, "CHORD_PROB_HARD": 0.040, "CHORD_PROB_VERY_HARD": 0.055,
        "CHORD_MIN_DIST": 3,
        "LONG_THR_PCT": 60, "LONG_MIN_SEC": 0.28, "LONG_SNAP_MIN_SEC": 0.30,
        "JUMP_STRENGTH_EASY": 0.85, "JUMP_STRENGTH_HARD": 0.90, "JUMP_STRENGTH_VERY_HARD": 0.95,
    },
}

def pick_chorus_window_start(rms_smooth: np.ndarray,
                             rms_times: np.ndarray,
                             duration: float,
                             preview_len: float = 10.0,
                             intro_skip: float = 15.0,
                             outro_skip: float = 10.0) -> float:
    """
    rms_smooth, rms_times 기반으로 '에너지 큰 구간'을 preview_len초 창으로 찾아 시작 시각을 반환.
    - intro_skip: 앞부분 제외(인트로 방지)
    - outro_skip: 끝부분 제외(아웃트로 방지)
    """
    if rms_smooth is None or len(rms_smooth) == 0:
        return 0.0

    # 유효 탐색 범위
    min_t = float(intro_skip)
    max_t = float(max(min_t, duration - outro_skip - preview_len))
    if max_t <= min_t:
        return 0.0

    # rms_times는 프레임 시간 배열, hop=512 기준 대략 0.01초~0.02초 단위
    dt = float(np.median(np.diff(rms_times))) if len(rms_times) > 1 else 0.02
    win_n = max(1, int(round(preview_len / dt)))

    # 창 합산(에너지 총량)으로 후렴 후보 찾기
    # conv(valid) 결과 i는 "창 시작 index"
    kernel = np.ones(win_n, dtype=float)
    energy_sum = np.convolve(rms_smooth, kernel, mode="valid")

    # 창 시작 시간이 min_t~max_t 사이인 후보만 남기기
    start_times = rms_times[:len(energy_sum)]
    mask = (start_times >= min_t) & (start_times <= max_t)
    if not np.any(mask):
        return 0.0

    idx = int(np.argmax(np.where(mask, energy_sum, -1.0)))
    start = float(start_times[idx])

    # 보기 좋게 0.5초 단위 스냅(선택)
    start = round(start * 2) / 2.0
    return max(0.0, start)

def apply_preset(diff: str):
    diff = (diff or "easy").lower()
    cfg = PRESET.get(diff, PRESET["easy"])
    globals().update(cfg)
    return diff

def clamp_time(t: float) -> float:
    return 0.0 if t < 0.0 else t

def tkey(t: float) -> float:
    return round(float(t), 3)

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
    if not times:
        return times
    max_cnt = max(1, int(np.floor(max_nps)))
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

# =========================
# 점유(겹침) 체크 유틸
# =========================
def interval_overlap(a0, a1, b0, b1) -> bool:
    return not (a1 <= b0 + EPS or b1 <= a0 + EPS)

def lane_free_interval(occ_intervals, lane: int, s: float, e: float) -> bool:
    s2, e2 = s - OCC_EPS, e + OCC_EPS
    for (os, oe) in occ_intervals[lane]:
        if interval_overlap(s2, e2, os, oe):
            return False
    return True

def lane_free_tap(occ_intervals, lane_last_tap, lane: int, t: float, min_gap: float) -> bool:
    s, e = t - OCC_EPS, t + OCC_EPS
    if not lane_free_interval(occ_intervals, lane, s, e):
        return False
    last = lane_last_tap.get(lane, None)
    if last is not None and (t - last) < min_gap:
        return False
    return True

def add_interval(occ_intervals, lane: int, s: float, e: float):
    occ_intervals[lane].append((s, e))

# =========================
# ✅ 최종 방어막(sanitize)
# =========================
def _overlap(a0, a1, b0, b1) -> bool:
    return not (a1 <= b0 + 1e-9 or b1 <= a0 + 1e-9)

def sanitize_notes(notes: list[dict]) -> list[dict]:
    longs_by_lane = {i: [] for i in LANES}
    taps = []

    for n in notes:
        if n.get("type") == "long" and n.get("endTime") is not None:
            s = float(n["time"])
            e = float(n["endTime"])
            if e > s:
                longs_by_lane[int(n["lane"])].append((s, e, n))
        else:
            taps.append(n)

    cleaned_longs = []
    kept_intervals = {i: [] for i in LANES}

    # 1) long-long 겹침 제거
    for lane in LANES:
        arr = sorted(longs_by_lane[lane], key=lambda x: (x[0], x[1]))
        kept = []
        for s, e, n in arr:
            if not kept:
                kept.append((s, e, n))
                continue
            ps, pe, pn = kept[-1]
            if _overlap(ps, pe, s, e):
                prev_len = pe - ps
                cur_len = e - s
                # 더 짧은 걸 버림(같으면 현재 버림)
                if cur_len <= prev_len:
                    continue
                else:
                    kept[-1] = (s, e, n)
            else:
                kept.append((s, e, n))

        for s, e, n in kept:
            cleaned_longs.append(n)
            kept_intervals[lane].append((float(s), float(e)))

    # 2) long 구간 안 tap 제거
    cleaned_taps = []
    for n in taps:
        lane = int(n["lane"])
        t = float(n["time"])
        inside = False
        for s, e in kept_intervals[lane]:
            if (s - OCC_EPS) <= t <= (e + OCC_EPS):
                inside = True
                break
        if not inside:
            cleaned_taps.append(n)

    out = cleaned_longs + cleaned_taps
    out.sort(key=lambda n: (float(n["time"]), 0 if n["type"] == "tap" else 1, int(n["lane"])))
    return out

def dedup_exact(notes: list[dict]) -> list[dict]:
    # DB uq_note_dedup 대응: 완전 동일 노트 제거
    seen = set()
    out = []
    for n in notes:
        k = (
            round(float(n["time"]), 3),
            int(n["lane"]),
            n["type"],
            None if n["endTime"] is None else round(float(n["endTime"]), 3),
        )
        if k in seen:
            continue
        seen.add(k)
        out.append(n)
    return out

# =========================
# API
# =========================
@app.get("/ping")
def ping():
    return jsonify({"ok": True, "version": "2026-01-09-guarded-sanitize-hell"})

@app.post("/analyze")
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    file = request.files["file"]

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    tmp_path = tmp.name
    tmp.close()
    file.save(tmp_path)

    diff = (request.form.get("diff") or "easy").strip().lower()
    print("FLASK_DIFF =", diff)
    diff = apply_preset(diff)

    rng = np.random.default_rng(SEED) if SEED is not None else np.random.default_rng()

    try:
        y, sr = librosa.load(tmp_path, sr=None, mono=True)

        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        if beat_times is None or len(beat_times) < 2:
            duration = float(librosa.get_duration(y=y, sr=sr))
            beat_times = np.arange(0.0, duration, 0.5, dtype=float)
        beat_times = np.array(beat_times, dtype=float)

        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, backtrack=False)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)

        hop = 512
        rms = librosa.feature.rms(y=y, hop_length=hop)[0]
        rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)

        win = 6
        rms_smooth = np.convolve(rms, np.ones(win) / win, mode="same")
        
        duration = float(librosa.get_duration(y=y, sr=sr))

        preview_len = 10.0
        chorus_start = pick_chorus_window_start(
             rms_smooth=rms_smooth,
             rms_times=rms_times,
             duration=duration,
             preview_len=preview_len,
             intro_skip=15.0,
             outro_skip=10.0
        )

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

        # =========================
        # 롱 후보 구간 추출
        # =========================
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

        # =========================
        # 그리드 스냅
        # =========================
        grid_easy = beat_times
        grid_hard = make_subgrid(beat_times, SUBDIV_HARD)
        grid_very_hard = make_subgrid(beat_times, SUBDIV_VERY_HARD)

        def snap_time_by_energy(t: float) -> float:
            if diff == "easy":
                return snap_to_grid(t, grid_easy)
            lv = energy_level(t)
            if lv == "very_hard":
                return snap_to_grid(t, grid_very_hard)
            if lv == "hard":
                return snap_to_grid(t, grid_hard)
            return snap_to_grid(t, grid_easy)

        snapped_longs = []
        for (t0, t1) in long_segments:
            s = snap_time_by_energy(t0)
            e = snap_time_by_energy(t1)
            if e - s >= LONG_SNAP_MIN_SEC:
                snapped_longs.append((s, e))
        snapped_longs.sort(key=lambda x: (x[0], x[1]))

        def in_any_long(t: float, longs) -> bool:
            for s, e in longs:
                if s <= t <= e:
                    return True
            return False

        # =========================
        # 온셋 스냅 + 간격 필터
        # =========================
        snapped_onsets = [snap_time_by_energy(float(t)) for t in onset_times]
        snapped_onsets.sort()

        filtered_onsets = []
        last = -1e9
        for t in snapped_onsets:
            lv = "easy" if diff == "easy" else energy_level(t)
            gap = MIN_GAP_EASY if lv == "easy" else (MIN_GAP_HARD if lv == "hard" else MIN_GAP_VERY_HARD)
            if t - last >= gap:
                filtered_onsets.append(t)
                last = t

        # 롱 구간 안의 탭 제거(1차)
        filtered_onsets = [t for t in filtered_onsets if not in_any_long(t, snapped_longs)]
        filtered_onsets = [round(float(t), 3) for t in filtered_onsets]
        filtered_onsets.sort()

        # 스냅 중복 제거
        dedup = []
        last_t = None
        for t in filtered_onsets:
            if last_t is None or t != last_t:
                dedup.append(t)
                last_t = t
        filtered_onsets = dedup

        # easy: 유지확률 + NPS 캡
        if diff == "easy":
            filtered_onsets = [t for t in filtered_onsets if rng.random() < EASY_KEEP]
            filtered_onsets.sort()
            filtered_onsets = cap_by_nps(filtered_onsets, MAX_NPS_EASY)

        # hard/hell: very_hard 구간에 추가 타격(옵션)
        if diff in ("hard", "hell"):
            extra_prob = 0.25 if diff == "hard" else 0.40
            extra = []
            onset_np = np.array(filtered_onsets, dtype=float) if filtered_onsets else np.array([], dtype=float)

            for tg in grid_very_hard:
                tg = float(tg)
                if energy_level(tg) != "very_hard":
                    continue
                if in_any_long(tg, snapped_longs):
                    continue
                if onset_np.size > 0 and np.min(np.abs(onset_np - tg)) < MIN_GAP_VERY_HARD:
                    continue
                if rng.random() < extra_prob:
                    extra.append(round(tg, 3))
                    onset_np = np.append(onset_np, tg)

            if extra:
                filtered_onsets = sorted(filtered_onsets + extra)

        # =========================
        # 레인 선택
        # =========================
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
            weights[last_lane] = 0.0
            weights = weights / weights.sum()

            lane = int(rng.choice(lanes, p=weights))
            last_lane = lane
            return lane

        def chord_prob(lv: str) -> float:
            if diff == "easy":
                return 0.0
            if lv == "very_hard":
                return CHORD_PROB_VERY_HARD
            if lv == "hard":
                return CHORD_PROB_HARD
            return CHORD_PROB_EASY

        def pick_lane_far_from(base_lane: int) -> int:
            candidates = [
                i for i in LANES
                if i != base_lane and i not in CHORD_EXCLUDE and abs(i - base_lane) >= CHORD_MIN_DIST
            ]
            if candidates:
                return int(rng.choice(candidates))
            for off in (3, 4, 2, 5, 1, 6):
                c = (base_lane + off) % 7
                if c not in CHORD_EXCLUDE and c != base_lane:
                    return int(c)
            return int((base_lane + 3) % 7)

        # =========================
        # ✅ 강제 규칙: 점유 기반 생성
        # =========================
        notes = []

        occ_intervals = {lane: [] for lane in LANES}
        lane_last_tap = {}

        # (시간별) 동시에 몇 개 노트가 존재하는지: 최대 2개
        time_bucket_count = defaultdict(int)

        def can_add_at_time(t: float) -> bool:
            return time_bucket_count[tkey(t)] < 2

        def inc_time_bucket(t: float):
            time_bucket_count[tkey(t)] += 1

        def try_place_long(s: float, e: float, lv: str):
            # 롱 시작 시점도 동시 카운트에 포함(3개 순간동시 방지)
            if not can_add_at_time(s):
                return None

            for _ in range(10):
                lane = pick_lane(lv)
                if lane_free_interval(occ_intervals, lane, s, e):
                    add_interval(occ_intervals, lane, s, e)
                    inc_time_bucket(s)
                    return (lane, s, e)

            for lane in LANES:
                if lane_free_interval(occ_intervals, lane, s, e):
                    add_interval(occ_intervals, lane, s, e)
                    inc_time_bucket(s)
                    return (lane, s, e)
            return None

        def try_place_tap(t: float, lv: str, min_gap: float):
            if not can_add_at_time(t):
                return None

            for _ in range(10):
                lane = pick_lane(lv)
                if lane_free_tap(occ_intervals, lane_last_tap, lane, t, min_gap):
                    add_interval(occ_intervals, lane, t - OCC_EPS, t + OCC_EPS)
                    lane_last_tap[lane] = t
                    inc_time_bucket(t)
                    return lane

            for lane in LANES:
                if lane_free_tap(occ_intervals, lane_last_tap, lane, t, min_gap):
                    add_interval(occ_intervals, lane, t - OCC_EPS, t + OCC_EPS)
                    lane_last_tap[lane] = t
                    inc_time_bucket(t)
                    return lane
            return None

        # 1) 롱 먼저 배치
        for (s0, e0) in snapped_longs:
            lv = "easy" if diff == "easy" else energy_level(s0)
            st = clamp_time(float(s0) + GLOBAL_OFFSET)
            et = clamp_time(float(e0) + GLOBAL_OFFSET)
            if et - st < LONG_SNAP_MIN_SEC:
                continue

            placed = try_place_long(st, et, lv)
            if placed is None:
                continue

            lane, st2, et2 = placed
            notes.append({"time": round(st2, 3), "lane": lane, "type": "long", "endTime": round(et2, 3)})

        # 2) 탭 + (최대 2개) 동시노트
        for t0 in filtered_onsets:
            lv = "easy" if diff == "easy" else energy_level(t0)
            min_gap = MIN_GAP_EASY if lv == "easy" else (MIN_GAP_HARD if lv == "hard" else MIN_GAP_VERY_HARD)

            tt = clamp_time(float(t0) + GLOBAL_OFFSET)

            lane1 = try_place_tap(tt, lv, min_gap)
            if lane1 is None:
                continue

            notes.append({"time": round(tt, 3), "lane": lane1, "type": "tap", "endTime": None})

            # chord: 최대 2개(시간버킷으로 강제), SPACE 제외
            if lane1 not in CHORD_EXCLUDE and rng.random() < chord_prob(lv) and can_add_at_time(tt):
                lane2 = pick_lane_far_from(lane1)
                if lane2 not in CHORD_EXCLUDE:
                    if lane_free_tap(occ_intervals, lane_last_tap, lane2, tt, min_gap) and can_add_at_time(tt):
                        add_interval(occ_intervals, lane2, tt - OCC_EPS, tt + OCC_EPS)
                        lane_last_tap[lane2] = tt
                        inc_time_bucket(tt)
                        notes.append({"time": round(tt, 3), "lane": int(lane2), "type": "tap", "endTime": None})

        # ✅ 최종 방어막
        notes = sanitize_notes(notes)
        notes = dedup_exact(notes)

        return jsonify({
    	"version": "2026-01-09-guarded-sanitize-hell",
    	"difficulty": diff,
    	"tempo": float(np.atleast_1d(tempo)[0]),
    	"duration": duration,
    	"previewStartSec": chorus_start,
    	"previewDurationSec": preview_len,
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
