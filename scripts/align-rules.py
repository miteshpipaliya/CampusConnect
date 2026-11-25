import hashlib,json
from pathlib import Path
from faster_whisper import WhisperModel
model=WhisperModel("small",device="cpu",compute_type="int8",cpu_threads=4)
for name,duration in [("rules_Declar",23.248938),("rule_one",52.192625),("rule_two",48.927313),("rule_thee",56.267750),("reffer-clng",133.485688)]:
    p=Path("public/audio/rules")/(name+".mp3")
    segments,info=model.transcribe(str(p),beam_size=5,word_timestamps=True,vad_filter=False,language="en",initial_prompt="CampusConnect, BugBoy, BVM, Birla Vishvakarma Mahavidyalaya, referral challenge, The Alchemist.")
    words=[{"word":w.word.strip(),"start":round(w.start,3),"end":round(w.end,3)} for s in segments for w in (s.words or []) if w.word.strip()]
    if not words: raise RuntimeError(name+" has no words")
    data={"name":name,"duration":duration,"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"words":words,"reviewed":False}
    print("RULE_ALIGNMENT_JSON "+json.dumps(data,separators=(",",":")),flush=True)
