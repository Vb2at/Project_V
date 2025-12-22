from flask import Flask, request, jsonify
import librosa

app = Flask(__name__)

@app.route("/analyze", methods=["POST"])
def analyze():
    file = request.files["file"]
    file.save("temp.mp3")

    y, sr = librosa.load("temp.mp3", sr=None)
    onsets = librosa.onset.onset_detect(y=y, sr=sr)

    notes = []
    for i, onset in enumerate(onsets):
        time_sec = float(librosa.frames_to_time(onset, sr=sr))
        notes.append({
            "time": round(time_sec, 3),
            "lane": i % 7
        })

    return jsonify({
        "noteCount": len(notes),
        "notes": notes[:30]
    })

if __name__ == "__main__":
    app.run(port=5000)