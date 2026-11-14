#!/usr/bin/env python3
"""
Arletex Specialist Models Microservice
Provides local, isolated HTTP inference for:
1. EmbeddingGemma 300M (Semantic memory embeddings)
2. Whisper Small (Voice input transcription)
3. Kokoro 82M (Voice speech synthesis)
"""

import sys
import os
import json
import base64
import tempfile
import io
import wave
from http.server import HTTPServer, BaseHTTPRequestHandler

# Paths to models
BASE_MODELS_DIR = "/home/proof/models/arle-specialists"
EMBEDDING_MODEL_DIR = os.path.join(BASE_MODELS_DIR, "embeddinggemma-300m")
WHISPER_MODEL_DIR = os.path.join(BASE_MODELS_DIR, "whisper-small")
KOKORO_MODEL_DIR = os.path.join(BASE_MODELS_DIR, "kokoro-82m")
RVC_MODEL_DIR = os.path.join(BASE_MODELS_DIR, "rvc-arlecchino")
RVC_MODEL_PATH = os.path.join(RVC_MODEL_DIR, "arlecchino_500e.pth")
RVC_INDEX_PATH = os.path.join(RVC_MODEL_DIR, "arlecchino_500e.index")

print(f"[Specialists] Initializing Arletex Specialist Services from {BASE_MODELS_DIR}...")

# 1. Initialize EmbeddingGemma
embedding_model = None
try:
    if os.path.exists(EMBEDDING_MODEL_DIR):
        from sentence_transformers import SentenceTransformer
        print(f"[Specialists] Loading EmbeddingGemma from {EMBEDDING_MODEL_DIR}...")
        embedding_model = SentenceTransformer(EMBEDDING_MODEL_DIR)
        print("[Specialists] EmbeddingGemma 300M loaded successfully.")
    else:
        print(f"[Specialists] WARNING: EmbeddingGemma directory not found: {EMBEDDING_MODEL_DIR}")
except Exception as e:
    print(f"[Specialists] ERROR: Failed to load EmbeddingGemma: {e}", file=sys.stderr)

# 2. Lazy Whisper Loader
whisper_model = None
def get_whisper():
    global whisper_model
    if whisper_model is None and os.path.exists(WHISPER_MODEL_DIR):
        from faster_whisper import WhisperModel
        print(f"[Specialists] Loading Whisper Small on CPU (int8)...")
        whisper_model = WhisperModel(WHISPER_MODEL_DIR, device="cpu", compute_type="int8")
        print("[Specialists] Whisper Small loaded successfully.")
    return whisper_model

# 3. Lazy Kokoro Loader
kokoro_pipeline = None
voice_cache = {}

def get_voice_tensor(voice_name: str):
    if not voice_name:
        voice_name = "arlecchino"
    if voice_name in voice_cache:
        return voice_cache[voice_name]
    custom_path = os.path.join(KOKORO_MODEL_DIR, "voices", f"{voice_name}.pt" if not voice_name.endswith(".pt") else voice_name)
    if os.path.exists(custom_path):
        try:
            import torch
            t = torch.load(custom_path, weights_only=True)
            voice_cache[voice_name] = t
            return t
        except Exception as e:
            print(f"[Specialists] Voice tensor load error for {voice_name}: {e}")
    return voice_name

def get_kokoro():
    global kokoro_pipeline
    if kokoro_pipeline is None and os.path.exists(KOKORO_MODEL_DIR):
        try:
            from kokoro import KPipeline
            print(f"[Specialists] Initializing Kokoro TTS Pipeline (Arlecchino mode)...")
            kokoro_pipeline = KPipeline(lang_code='b')
            print("[Specialists] Kokoro 82M initialized successfully.")
        except Exception as e:
            print(f"[Specialists] Kokoro init note: {e}")
    return kokoro_pipeline

# Tone Profiles for Dynamic Emotional Voice Adaptation
TONE_PROFILES = {
    "commanding": {"pitch_lvl": -3.5, "speed": 0.89, "base_voice": "bf_emma", "env": 0.30},
    "authoritative": {"pitch_lvl": -3.5, "speed": 0.89, "base_voice": "bf_emma", "env": 0.30},
    "cold": {"pitch_lvl": -3.0, "speed": 0.91, "base_voice": "bf_emma", "env": 0.20},
    "stern": {"pitch_lvl": -3.0, "speed": 0.91, "base_voice": "bf_emma", "env": 0.20},
    "gentle": {"pitch_lvl": -1.0, "speed": 0.94, "base_voice": "af_nicole", "env": 0.40},
    "soft": {"pitch_lvl": -1.0, "speed": 0.94, "base_voice": "af_nicole", "env": 0.40},
    "intimate": {"pitch_lvl": -1.0, "speed": 0.92, "base_voice": "af_nicole", "env": 0.45},
    "intrigued": {"pitch_lvl": -1.5, "speed": 0.96, "base_voice": "bf_emma", "env": 0.28},
    "amused": {"pitch_lvl": -1.5, "speed": 0.96, "base_voice": "bf_emma", "env": 0.28},
    "analytical": {"pitch_lvl": -2.0, "speed": 0.93, "base_voice": "bf_emma", "env": 0.25},
    "neutral": {"pitch_lvl": -2.0, "speed": 0.93, "base_voice": "bf_emma", "env": 0.25},
}

# 4. Lazy RVC Arlecchino Voice Converter
rvc_converter = None
def get_rvc_converter():
    global rvc_converter
    if rvc_converter is None and os.path.exists(RVC_MODEL_PATH):
        try:
            from infer_rvc_python import BaseLoader
            print(f"[Specialists] Loading Arlecchino RVC Engine from {RVC_MODEL_PATH}...")
            converter = BaseLoader(only_cpu=True)
            converter.apply_conf(
                tag="arlecchino",
                file_model=RVC_MODEL_PATH,
                pitch_algo="rmvpe",
                file_index=RVC_INDEX_PATH if os.path.exists(RVC_INDEX_PATH) else "",
                index_influence=0.70,
                respiration_median_filtering=3,
                envelope_ratio=0.25,
                consonant_breath_protection=0.33,
                pitch_lvl=-2,
            )
            rvc_converter = converter
            print("[Specialists] Arlecchino RVC Engine loaded successfully.")
        except Exception as e:
            print(f"[Specialists] RVC init note: {e}")
    return rvc_converter

class SpecialistRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Quiet standard HTTP logging to avoid log noise
        pass

    def send_json(self, status_code, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {
                "status": "connected",
                "embeddingGemma": embedding_model is not None,
                "whisper": os.path.exists(WHISPER_MODEL_DIR),
                "kokoro": os.path.exists(KOKORO_MODEL_DIR)
            })
            return
        self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 25 * 1024 * 1024:  # 25MB max
            self.send_json(413, {"error": "Payload too large"})
            return

        body_raw = self.rfile.read(content_length)
        try:
            body = json.loads(body_raw.decode("utf-8")) if body_raw else {}
        except Exception:
            self.send_json(400, {"error": "Malformed JSON"})
            return

        # ==========================================
        # 1. Embedding Endpoint
        # ==========================================
        if self.path == "/embed":
            text = body.get("text", "")
            if not text:
                self.send_json(400, {"error": "text is required"})
                return

            if embedding_model is None:
                self.send_json(503, {"error": "EmbeddingGemma model is not available"})
                return

            try:
                emb = embedding_model.encode(text, normalize_embeddings=True)
                self.send_json(200, {
                    "dimensions": len(emb),
                    "embedding": emb.tolist(),
                    "model": "embeddinggemma-300m"
                })
            except Exception as e:
                self.send_json(500, {"error": f"Embedding failure: {str(e)}"})
            return

        # ==========================================
        # 2. Transcription Endpoint (Whisper)
        # ==========================================
        if self.path == "/transcribe":
            audio_b64 = body.get("audioBase64", "")
            if not audio_b64:
                self.send_json(400, {"error": "audioBase64 is required"})
                return

            whisper = get_whisper()
            if whisper is None:
                self.send_json(503, {"error": "Whisper Small model is not available"})
                return

            # Strip data URL prefix if present
            if "," in audio_b64:
                audio_b64 = audio_b64.split(",", 1)[1]

            temp_path = None
            try:
                audio_bytes = base64.b64decode(audio_b64)
                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                    f.write(audio_bytes)
                    temp_path = f.name

                segments, info = whisper.transcribe(temp_path, beam_size=3)
                transcript = " ".join([segment.text for segment in segments]).strip()

                self.send_json(200, {
                    "transcript": transcript,
                    "language": info.language,
                    "durationSeconds": info.duration
                })
            except Exception as e:
                self.send_json(500, {"error": f"Transcription error: {str(e)}"})
            finally:
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass
            return

        # ==========================================
        # 3. Speech Synthesis Endpoint (Kokoro)
        # ==========================================
        if self.path == "/synthesize":
            text = body.get("text", "")
            voice = body.get("voice", "arlecchino")
            tone = body.get("tone", "neutral").lower()
            lead_padding_ms = int(body.get("leadPaddingMs", 0))

            profile = TONE_PROFILES.get(tone, TONE_PROFILES["neutral"])
            speed = float(body.get("speed", profile["speed"]))
            pitch_shift = float(body.get("pitch_lvl", profile["pitch_lvl"]))
            envelope = float(profile["env"])

            if not text:
                self.send_json(400, {"error": "text is required"})
                return

            try:
                # Direct Kokoro synthesis with custom Arlecchino tensor support
                pipeline = get_kokoro()
                if pipeline is not None:
                    base_voice = voice
                    if base_voice == "arlecchino":
                        base_voice = profile["base_voice"]
                    voice_param = get_voice_tensor(base_voice)
                    generator = pipeline(text, voice=voice_param, speed=speed)
                    all_audio = []
                    sample_rate = 24000
                    for _, _, audio in generator:
                        all_audio.append(audio)

                    if all_audio:
                        import numpy as np
                        import soundfile as sf
                        combined = np.concatenate(all_audio)

                        # Check for 1:1 Arlecchino RVC voice conversion with dynamic tone
                        rvc = get_rvc_converter()
                        final_audio_bytes = None
                        final_sample_rate = sample_rate

                        if rvc is not None:
                            temp_in = tempfile.mktemp(suffix=".wav")
                            try:
                                sf.write(temp_in, combined, sample_rate, format='WAV')
                                rvc.apply_conf(
                                    tag="arlecchino",
                                    file_model=RVC_MODEL_PATH,
                                    pitch_algo="rmvpe",
                                    file_index=RVC_INDEX_PATH if os.path.exists(RVC_INDEX_PATH) else "",
                                    index_influence=0.70,
                                    respiration_median_filtering=3,
                                    envelope_ratio=envelope,
                                    consonant_breath_protection=0.33,
                                    pitch_lvl=pitch_shift,
                                )
                                rvc_res = rvc([temp_in], ["arlecchino"], show_progress=False)
                                if rvc_res and len(rvc_res) > 0 and os.path.exists(rvc_res[0]):
                                    converted_path = rvc_res[0]
                                    # Read converted audio and apply leading hardware wake-up pad if needed
                                    data, sr = sf.read(converted_path, dtype='float32')
                                    if lead_padding_ms > 0:
                                        lead_samples = int(sr * (lead_padding_ms / 1000.0))
                                        data = np.pad(data, (lead_samples, 0), mode='constant')
                                    out_buf = io.BytesIO()
                                    sf.write(out_buf, data, sr, format='WAV')
                                    final_audio_bytes = out_buf.getvalue()
                                    final_sample_rate = sr
                                    try:
                                        os.remove(converted_path)
                                    except Exception:
                                        pass
                            except Exception as rvc_err:
                                print(f"[Specialists] RVC conversion fallback: {rvc_err}")
                            finally:
                                if os.path.exists(temp_in):
                                    try:
                                        os.remove(temp_in)
                                    except Exception:
                                        pass

                        if not final_audio_bytes:
                            if lead_padding_ms > 0:
                                lead_samples = int(sample_rate * (lead_padding_ms / 1000.0))
                                combined = np.pad(combined, (lead_samples, 0), mode='constant')
                            out_buf = io.BytesIO()
                            sf.write(out_buf, combined, sample_rate, format='WAV')
                            final_audio_bytes = out_buf.getvalue()

                        encoded = base64.b64encode(final_audio_bytes).decode("utf-8")
                        self.send_json(200, {
                            "audioBase64": f"data:audio/wav;base64,{encoded}",
                            "format": "wav",
                            "sampleRate": final_sample_rate
                        })
                        return

                self.send_json(503, {"error": "Kokoro synthesizer is offline or initializing"})
            except Exception as e:
                self.send_json(500, {"error": f"Synthesis error: {str(e)}"})
            return

        self.send_json(404, {"error": "Endpoint not found"})

def run_server(port=39282):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, SpecialistRequestHandler)
    print(f"[Specialists] Listening on http://127.0.0.1:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[Specialists] Shutting down...")
    finally:
        httpd.server_close()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 39282
    run_server(port)
