"""Development-only audio transcription. No visitor-facing ASR dependency."""
import hashlib
import json
from pathlib import Path
from faster_whisper import WhisperModel

source = Path("public/audio/introduction.mp3")
model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
segments, info = model.transcribe(str(source), beam_size=5, word_timestamps=True, vad_filter=True)
words = []
for segment in segments:
    for word in segment.words or []:
        if word.word.strip():
            words.append({"word":word.word.strip(),"start":round(word.start,3),"end":round(word.end,3)})
if not words:
    raise RuntimeError("No speech detected")
data = {"audio":"/audio/introduction.mp3","duration":102.687313,"sha256":hashlib.sha256(source.read_bytes()).hexdigest(),"language":info.language,"method":"faster-whisper-small-word-timestamps","reviewed":False,"words":words}
output = Path("public/data/introduction-timings.json")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("INTRO_ALIGNMENT_JSON "+json.dumps(data,ensure_ascii=False,separators=(",",":")),flush=True)
