# ✅ app.py (tap + long + 박자 스냅 + 계단식 lane 제거 풀코드)
# - onset -> tap
# - RMS sustain -> long
# - beat grid snap
# - ✅ lane 배치: i%7 순환 제거(계단 패턴 제거) + 연속 같은 lane 방지 + 가까운 lane 선호

from flask import Flask, request, jsonify
import librosa
import numpy as np
import os, tempfile

app = Flask(__name__)

@app.route("/analyze", methods=["POST"])
def analyze():
    file = request.files["file"]

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    tmp_path = tmp.name
    tmp.close()
    file.save(tmp_path)

    try:
        y, sr = librosa.load(tmp_path, sr=None, mono=True)

        # ✅ 1) 박자(beat) 추출
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        # beat이 너무 적게 잡히면 fallback
        if beat_times is None or len(beat_times) < 2:
            beat_times = np.arange(0, librosa.get_duration(y=y, sr=sr), 0.5)

        # ✅ 2) onset(타격점) 추출
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, backtrack=True)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)

        # ✅ 3) RMS로 sustain(지속음) 구간 잡기 -> 롱노트 후보
        hop = 512
        rms = librosa.feature.rms(y=y, hop_length=hop)[0]
        rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)

        # ✅ 롱노트 빈도 조절: 퍼센타일 낮추면 long 많아짐, 올리면 줄어듦
        thr = float(np.percentile(rms, 50))
        mask = rms >= thr

        long_segments = []
        start = None
        for i, m in enumerate(mask):
            if m and start is None:
                start = i
            if (not m or i == len(mask) - 1) and start is not None:
                end = i if not m else i
                t0 = float(rms_times[start])
                t1 = float(rms_times[end])
                if t1 - t0 >= 0.65:  # ✅ 롱노트 최소 길이 조절 (숫자 클수록 길어짐)
                    long_segments.append((t0, t1))
                start = None

        # ✅ 4) beat grid 스냅(가장 가까운 beat로)
        beat_times_np = np.array(beat_times)

        def snap_to_beat(t: float) -> float:
            idx = int(np.argmin(np.abs(beat_times_np - t)))
            return float(beat_times_np[idx])

        # onset들을 스냅
        snapped_onsets = [snap_to_beat(float(t)) for t in onset_times]
        # ✅ 계단/밀도 이슈 방지: set으로 너무 줄어들면 비게 느껴질 수 있음
        snapped_onsets = sorted(snapped_onsets)

        # ✅ 최소 간격(초) - 너무 붙으면 삭제 (비면 낮추고, 빽빽하면 올리기)
        min_gap = 0.08
        filtered_onsets = []
        last = -1e9
        for t in snapped_onsets:
            if t - last >= min_gap:
                filtered_onsets.append(t)
                last = t

        # 롱노트도 시작/끝 스냅
        snapped_longs = []
        for (t0, t1) in long_segments:
            s = snap_to_beat(t0)
            e = snap_to_beat(t1)
            if e - s >= 0.35:
                snapped_longs.append((s, e))

        # ✅ 5) tap vs long 겹침 처리: long 구간 안의 tap은 제거
        def in_any_long(t: float) -> bool:
            for s, e in snapped_longs:
                if s <= t <= e:
                    return True
            return False

        filtered_onsets = [t for t in filtered_onsets if not in_any_long(t)]

        # ✅ 6) lane 배치: 계단식(i%7) 제거 + 연속 같은 lane 방지 + 가까운 lane 선호
        notes = []
        rng = np.random.default_rng()  # 재실행마다 패턴 다르게. 고정하고 싶으면 seed 넣기: np.random.default_rng(42)
        last_lane = None

        def pick_lane() -> int:
            nonlocal last_lane
            lanes = np.arange(7)

            if last_lane is None:
                lane = int(rng.integers(0, 7))
                last_lane = lane
                return lane

            # 원형 거리(0-6도 가까움 처리)
            dist = np.abs(lanes - last_lane)
            dist = np.minimum(dist, 7 - dist)

            # 가까운 lane 선호, 같은 lane은 금지
            weights = 1 / (dist + 1)
            weights[last_lane] = 0
            weights = weights / weights.sum()

            lane = int(rng.choice(lanes, p=weights))
            last_lane = lane
            return lane

        # long 먼저 추가
        for (s, e) in snapped_longs:
            lane = pick_lane()
            notes.append({
                "time": round(float(s), 3),
                "lane": lane,
                "type": "long",
                "endTime": round(float(e), 3)
            })

        # tap 추가
        for t in filtered_onsets:
            lane = pick_lane()
            notes.append({
                "time": round(float(t), 3),
                "lane": lane,
                "type": "tap",
                "endTime": None
            })

        # 시간순 정렬
        notes.sort(key=lambda n: n["time"])

        return jsonify({
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
