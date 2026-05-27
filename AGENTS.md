# Project Notes for AI Agents

This project follows the global AI-native full-stack engineering standard supplied by the user. The notes below add project-specific context for `D:\wakeup_demo`.

## Current Voice ASR Direction

- `voice-service` no longer needs Baidu ASR as the default path.
- Local FunASR has been wired into `voice-service/asr_service.py`.
- Model files are stored under `voice-service/models/funasr/` and must not be committed.
- The expected model layout is:

```text
voice-service/models/funasr/
  paraformer-zh/
  fsmn-vad/
  ct-punc/
```

- Runtime configuration for local testing:

```bat
set VOICE_ASR_ENGINE=funasr
set VOICE_ASR_MODEL_DIR=D:\wakeup_demo\voice-service\models\funasr
set VOICE_FUNASR_DEVICE=cpu
set VOICE_FUNASR_DISABLE_UPDATE=true
```

- Runtime configuration for Docker/Linux:

```env
VOICE_ASR_ENGINE=funasr
VOICE_ASR_MODEL_DIR=/app/models/funasr
VOICE_FUNASR_DEVICE=cpu
VOICE_FUNASR_DISABLE_UPDATE=true
```

## Browser Wakeup Flow

The current wakeup flow is ASR-based:

```text
Browser microphone
-> frontend 16k PCM frames
-> WebSocket /ws
-> voice-service VoicePipeline
-> ASRService FunASR local model
-> text wake-word matching
-> wakeup event
```

Do not assume the cloud server can directly access the user's microphone. The browser captures microphone audio and streams frames to the backend.

## Next Work: Local Model Tuning

Future voice work should focus on local model tuning and wakeup quality, not on replacing Baidu again.

Priority areas:

- Improve wake-word hit rate for `小智小智` and configured alternatives.
- Reduce false positives from short/noisy ASR segments.
- Tune audio chunk sizes and recognition cadence in `voice-service/voice_pipeline.py`.
- Tune silence, empty-speech, and minimum-audio filtering before ASR.
- Add better logging around wakeup attempts: recognized text, duration, state, and whether it matched.
- Consider using VAD before ASR to avoid sending empty 3-second chunks through FunASR.
- If ASR-based wakeup remains too slow or unstable, evaluate a dedicated wake-word detector before the ASR stage.

## Validation Expectations

When changing voice behavior:

- Verify direct local ASR with the bundled example WAV.
- Verify browser microphone frames still reach `voice-service`.
- Verify logs show `[perf] FunASR ASR` and `[wake] ASR=...` or `[command] ASR=...`.
- Verify `voice-service/models/` remains ignored by Git.
- Do not claim wakeup quality improved without testing real microphone speech in the browser.
