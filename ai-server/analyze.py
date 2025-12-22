import sys
import json
import librosa

if len(sys.argv) < 2:
    print("사용법: python analyze.py <파일명.mp3>")
    sys.exit(1)

AUDIO_PATH = sys.argv[1]

y, sr = librosa.load(AUDIO_PATH, sr=None)
onsets = librosa.onset.onset_detect(y=y, sr=sr)

notes = []
for i, onset in enumerate(onsets):
    time_sec = float(librosa.frames_to_time(onset, sr=sr))
    lane = i % 7
    notes.append({
        "time": round(time_sec, 3),
        "lane": lane
    })

result = {
    "noteCount": len(notes),
    "notes": notes[:30]
}

print(json.dumps(result, indent=2))

with open("result.json", "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print(f"\n✅ 분석 완료! '{AUDIO_PATH}' → result.json 생성됨")
