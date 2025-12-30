# app.py (tap + long + 박자 스냅 + 에너지(빵빵) 기반 난이도 업 + 단조 패턴 완화)
# - onset -> tap
# - RMS sustain -> long
# - beat grid snap (구간별로 1박/반박/4분박 그리드 선택)
# - 에너지(빵빵) 높은 구간: 더 촘촘한 그리드 + 동시노트(2키) 확률 + 점프(멀리 lane) 확률
# - lane 배치: i%7 계단식 제거 + 연속 같은 lane 방지 + (평소: 가까운 lane 선호 / 하드: 멀리도 잘 뜨게)
#
# 튜닝 포인트
#   GLOBAL_OFFSET: 전체 타이밍 앞/뒤로 미세조정
#   HARD_PCT / VERY_HARD_PCT: 하드 구간 비율
#   SUBDIV_HARD / SUBDIV_VERY_HARD: 하드 구간 그리드 촘촘함(2=8비트,4=16비트)
#   CHORD_PROB_*: 동시노트 확률
#   JUMP_STRENGTH_*: 점프(멀리) 선호 강도
#   MIN_GAP_*: 최소 간격(빽빽함 조절)
#   LONG_MIN_SEC / LONG_SNAP_MIN_SEC: 롱노트 길이

from flask import Flask, request, jsonify
import librosa
import numpy as np
import os, tempfile

app = Flask(__name__)

SPACE_LANE = 3

# ====== 전역 튜닝 ======
GLOBAL_OFFSET = -0.096     # 예: -0.03이면 30ms 앞당김 (느리게 느껴지면 음수로)
SEED = 42               # 고정 패턴 원하면 정수로: 42

PRESET = {
    "easy": {
        "HARD_PCT": 87, "VERY_HARD_PCT": 93,
        "SUBDIV_HARD": 1, "SUBDIV_VERY_HARD": 1,
        "MIN_GAP_EASY": 0.10, "MIN_GAP_HARD": 0.092, "MIN_GAP_VERY_HARD": 0.084,
        "CHORD_PROB_EASY": 0.01, "CHORD_PROB_HARD": 0.018, "CHORD_PROB_VERY_HARD": 0.021,
        "CHORD_MIN_DIST": 2, 
        "LONG_THR_PCT": 45, "LONG_MIN_SEC": 0.7, "LONG_SNAP_MIN_SEC": 0.35,
        "JUMP_STRENGTH_EASY": 0.15, "JUMP_STRENGTH_HARD": 0.25, "JUMP_STRENGTH_VERY_HARD": 0.28,
    },
    "normal": {
        "HARD_PCT": 70, "VERY_HARD_PCT": 81,
        "SUBDIV_HARD": 2, "SUBDIV_VERY_HARD": 2,
        "MIN_GAP_EASY": 0.09, "MIN_GAP_HARD": 0.08, "MIN_GAP_VERY_HARD": 0.075,
        "CHORD_PROB_EASY": 0.015, "CHORD_PROB_HARD": 0.025, "CHORD_PROB_VERY_HARD": 0.033,
        "CHORD_MIN_DIST": 2,
        "LONG_THR_PCT": 53, "LONG_MIN_SEC": 0.45, "LONG_SNAP_MIN_SEC": 0.35,
        "JUMP_STRENGTH_EASY": 0.25, "JUMP_STRENGTH_HARD": 0.35, "JUMP_STRENGTH_VERY_HARD": 0.38,
    },
    "hard": {
        "HARD_PCT": 60, "VERY_HARD_PCT": 70,
        "SUBDIV_HARD": 2, "SUBDIV_VERY_HARD": 2,
        "MIN_GAP_EASY": 0.072, "MIN_GAP_HARD": 0.062, "MIN_GAP_VERY_HARD": 0.060,
        "CHORD_PROB_EASY": 0.019, "CHORD_PROB_HARD": 0.037, "CHORD_PROB_VERY_HARD": 0.045,
        "CHORD_MIN_DIST": 3,
        "LONG_THR_PCT": 55, "LONG_MIN_SEC": 0.388, "LONG_SNAP_MIN_SEC": 0.35,
        "JUMP_STRENGTH_EASY": 0.30, "JUMP_STRENGTH_HARD": 0.51, "JUMP_STRENGTH_VERY_HARD": 0.59,
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
    # beat_times 사이를 subdiv로 균등 분할해 sub grid 생성
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


def filter_by_min_gap(times: list[float], min_gap: float) -> list[float]:
    # times는 정렬된 상태라고 가정
    out = []
    last = -1e9
    for t in times:
        if t - last >= min_gap:
            out.append(t)
            last = t
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

        # beat이 너무 적게 잡히면 fallback(보험)
        if beat_times is None or len(beat_times) < 2:
            duration = float(librosa.get_duration(y=y, sr=sr))
            beat_times = np.arange(0.0, duration, 0.5, dtype=float)

        beat_times = np.array(beat_times, dtype=float)

        # ===== 2) onset(타격점) 추출 -> tap 후보 =====
        onset_frames = librosa.onset.onset_detect(
            y=y, sr=sr,
            backtrack=False  # "늦게 느껴짐"이면 False가 보통 덜 꼬임
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)

        # ===== 3) RMS sustain -> long 후보 + 에너지(빵빵) 맵 =====
        hop = 512
        rms = librosa.feature.rms(y=y, hop_length=hop)[0]
        rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)

        # 에너지 부드럽게(구간 단위로 안정적으로)
        win = 6  # 너무 크면 반응 느림 / 너무 작으면 출렁임
        rms_smooth = np.convolve(rms, np.ones(win) / win, mode="same")

        hard_thr = float(np.percentile(rms_smooth, HARD_PCT))
        very_hard_thr = float(np.percentile(rms_smooth, VERY_HARD_PCT))

        def energy_level(t: float) -> str:
            # t에 가장 가까운 RMS 프레임의 에너지로 난이도 구간 판정
            i = int(np.argmin(np.abs(rms_times - t)))
            e = float(rms_smooth[i])
            if e >= very_hard_thr:
                return "very_hard"
            if e >= hard_thr:
                return "hard"
            return "easy"

        # 롱노트 마스크(기존 방식 유지)
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

        # ===== 4) 구간별 스냅 그리드 준비 =====
        grid_easy = beat_times
        grid_hard = make_subgrid(beat_times, SUBDIV_HARD)
        grid_very_hard = make_subgrid(beat_times, SUBDIV_VERY_HARD)

        def snap_time_by_energy(t: float) -> float:
            lv = energy_level(t)
            if lv == "very_hard":
                return snap_to_grid(t, grid_very_hard)
            if lv == "hard":
                return snap_to_grid(t, grid_hard)
            return snap_to_grid(t, grid_easy)

        # onset들을 에너지 기준으로 스냅
        snapped_onsets = [snap_time_by_energy(float(t)) for t in onset_times]
        snapped_onsets = sorted(snapped_onsets)

        # 구간별 min_gap 적용(빽빽함 컨트롤)
        filtered_onsets = []
        # times를 순회하면서 각각의 난이도에 맞는 gap을 적용하려면,
        # 가장 간단히는 "현재 t 기준 gap"으로 필터링
        last = -1e9
        for t in snapped_onsets:
            lv = energy_level(t)
            gap = MIN_GAP_EASY if lv == "easy" else (MIN_GAP_HARD if lv == "hard" else MIN_GAP_VERY_HARD)
            if t - last >= gap:
                filtered_onsets.append(t)
                last = t

        # 롱노트도 시작/끝 스냅(구간별 그리드)
        snapped_longs = []
        for (t0, t1) in long_segments:
            s = snap_time_by_energy(t0)
            e = snap_time_by_energy(t1)
            if e - s >= LONG_SNAP_MIN_SEC:
                snapped_longs.append((s, e))

        # ===== 5) tap vs long 겹침 처리: long 구간 안의 tap 제거 =====
        def in_any_long(t: float) -> bool:
            for s, e in snapped_longs:
                if s <= t <= e:
                    return True
            return False

        filtered_onsets = [t for t in filtered_onsets if not in_any_long(t)]

        # ===== 5.5) 난이도(diff)별 체감 밀도 조절 =====
        # - easy: 일부 탭 노트 드랍(밀도 감소)
        # - hard: very_hard 구간에 그리드 기반 추가 탭(밀도 증가)
        if diff == "easy":
            keep = 0.70  # 0.55~0.85 튜닝 (낮출수록 더 쉬움)
            filtered_onsets = [t for t in filtered_onsets if rng.random() < keep]

        elif diff == "hard":
            extra = []
            onset_np = np.array(filtered_onsets, dtype=float) if filtered_onsets else np.array([], dtype=float)

            for tg in grid_very_hard:
                tg = float(tg)

                # very_hard 구간에서만 추가
                if energy_level(tg) != "very_hard":
                    continue
                # 롱노트 안이면 추가 금지
                if in_any_long(tg):
                    continue

                # 기존 탭과 너무 가까우면 추가 금지
                if onset_np.size > 0 and np.min(np.abs(onset_np - tg)) < MIN_GAP_VERY_HARD:
                    continue

                # 확률로 추가 (0.15~0.40 사이로 체감 튜닝)
                if rng.random() < 0.25:
                    extra.append(tg)
                    onset_np = np.append(onset_np, tg)

            if extra:
                filtered_onsets = sorted(filtered_onsets + extra)


        # ===== 6) lane 배치: 단조 패턴 완화 + 난이도 구간별 점프/동시노트 =====
        notes = []
        last_lane = None

        def pick_lane(lv: str) -> int:
            """easy: 가까운 lane 선호 / hard~very_hard: 점프 확률 증가"""
            nonlocal last_lane
            lanes = np.arange(7)

            if last_lane is None:
                lane = int(rng.integers(0, 7))
                last_lane = lane
                return lane

            # 원형 거리(0~6)
            dist = np.abs(lanes - last_lane)
            dist = np.minimum(dist, 7 - dist)

            # 기본: 가까운 lane 선호
            close_w = 1.0 / (dist + 1.0)

            # 점프 성향(멀수록 가중치)
            jump_w = (dist + 1.0)

            if lv == "very_hard":
                alpha = JUMP_STRENGTH_VERY_HARD
            elif lv == "hard":
                alpha = JUMP_STRENGTH_HARD
            else:
                alpha = JUMP_STRENGTH_EASY

            # 가까운 선호(close)와 점프 선호(jump)를 섞음
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
                and i != SPACE_LANE	# 스페이스 제외
                and abs(i - base_lane) >= CHORD_MIN_DIST
            ]
            if candidates:
                return int(rng.choice(candidates))
            return int((base_lane + 3) % 7)

        def chord_prob(lv: str) -> float:
            if lv == "very_hard":
                return CHORD_PROB_VERY_HARD
            if lv == "hard":
                return CHORD_PROB_HARD
            return CHORD_PROB_EASY

        # --- long 먼저 추가 (롱도 하드 구간에서 점프 성향 반영됨) ---
        for (s, e) in snapped_longs:
            lv = energy_level(s)
            lane = pick_lane(lv)

            st = clamp_time(float(s) + GLOBAL_OFFSET)
            et = clamp_time(float(e) + GLOBAL_OFFSET)

            notes.append({
                "time": round(st, 3),
                "lane": lane,
                "type": "long",
                "endTime": round(et, 3)
            })

        # --- tap 추가 + 하드 구간 동시노트(2키) ---
        for t in filtered_onsets:
            lv = energy_level(t)
            lane1 = pick_lane(lv)

            tt = clamp_time(float(t) + GLOBAL_OFFSET)

            notes.append({
                "time": round(tt, 3),
                "lane": lane1,
                "type": "tap",
                "endTime": None
            })

            # 하드 구간: 동시노트 추가 확률
            if lane1 != SPACE_LANE and rng.random() < chord_prob(lv):
                lane2 = pick_lane_far_from(lane1)
                notes.append({
                    "time": round(tt, 3),
                    "lane": lane2,
                    "type": "tap",
                    "endTime": None
                })

        # 시간순 정렬
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
