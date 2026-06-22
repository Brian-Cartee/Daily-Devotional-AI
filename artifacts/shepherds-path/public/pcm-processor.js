/**
 * PCM Processor — AudioWorklet
 * Runs on a dedicated audio thread. Sends raw float32 PCM (16kHz mono)
 * back to the main thread for streaming to the turn-detection WebSocket.
 * The main thread's MediaRecorder continues collecting webm for Whisper.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Float32Array(0);
    this._TARGET = 512; // match Silero VAD window size
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    // Accumulate until we have TARGET samples, then post
    const merged = new Float32Array(this._buf.length + channel.length);
    merged.set(this._buf);
    merged.set(channel, this._buf.length);
    this._buf = merged;

    while (this._buf.length >= this._TARGET) {
      const frame = this._buf.slice(0, this._TARGET);
      this._buf = this._buf.slice(this._TARGET);
      this.port.postMessage(frame.buffer, [frame.buffer]);
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
