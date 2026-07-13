/**
 * Async Philip playback with generation tokens and barge-in coordination.
 */
import { mp3ToPcm16, pcmDurationMs, publishMp3ToSource, startPcmPublishAsync } from "./audioUtil.mjs";
import { interruptConfigFromEnv, isAsyncPlaybackEnabled } from "./interruptionConfig.mjs";
import { InterruptionMonitor } from "./interruptionMonitor.mjs";
import { logPlaybackCompleted, logPlaybackEvent, logPlaybackInterrupted } from "./playbackLog.mjs";
import { publishTimelineToRoom } from "./sessionTimeline.mjs";

/** @typedef {'LISTENING' | 'PROCESSING' | 'PHILIP_SPEAKING' | 'INTERRUPT_CANDIDATE' | 'STOPPING_PLAYBACK'} LoopState */

export class PlaybackController {
  /**
   * @param {{
   *   audioSource: import('@livekit/rtc-node').AudioSource;
   *   room: import('@livekit/rtc-node').Room;
   *   timeline: import('./sessionTimeline.mjs').SessionTimeline;
   *   vadConfig: ReturnType<import('./audioUtil.mjs').vadConfigFromEnv>;
   *   sampleRate?: number;
   * }} deps
   */
  constructor(deps) {
    this.audioSource = deps.audioSource;
    this.room = deps.room;
    this.timeline = deps.timeline;
    this.sampleRate = deps.sampleRate ?? 48000;
    this.interruptMonitor = new InterruptionMonitor(interruptConfigFromEnv(deps.vadConfig));
    /** @type {LoopState} */
    this.loopState = "LISTENING";
    this.generation = 0;
    /** @type {{ generation: number; abortController: AbortController; completion: Promise<unknown>; cancelled: boolean } | null} */
    this.activePlayback = null;
    this.interruptUsedForGeneration = null;
  }

  isAsyncEnabled() {
    return isAsyncPlaybackEnabled();
  }

  /** @param {LoopState} next */
  setState(next) {
    this.loopState = next;
    this.timeline.mark("loop_state", { state: next });
  }

  getState() {
    return this.loopState;
  }

  isPhilipSpeaking() {
    return this.loopState === "PHILIP_SPEAKING" || this.loopState === "INTERRUPT_CANDIDATE";
  }

  /**
   * @param {import('@livekit/rtc-node').Room} room
   * @param {{ generation: number; reason: string }} payload
   */
  async publishPlaybackCancel(room, payload) {
    await publishTimelineToRoom(room, {
      phase: "playback_cancel",
      playbackGeneration: payload.generation,
      reason: payload.reason,
    });
  }

  async cancelActivePlayback(reason, { notifyClient = true } = {}) {
    const active = this.activePlayback;
    if (!active) return null;

    const { generation, abortController, completion } = active;
    this.setState("STOPPING_PLAYBACK");
    this.timeline.mark("playback_cancel_start", { generation, reason });
    active.cancelled = true;
    abortController.abort();

    if (notifyClient) {
      await this.publishPlaybackCancel(this.room, { generation, reason });
    }

    let result = null;
    try {
      result = await completion;
    } catch {
      result = { cancelled: true };
    }

    if (this.activePlayback?.generation === generation) {
      this.activePlayback = null;
    }
    this.setState("LISTENING");
    this.timeline.mark("playback_cancel_end", {
      generation,
      reason,
      discardedSamples: result?.discardedSamples ?? 0,
      framesPublished: result?.framesPublished ?? 0,
    });

    if (reason === "user_interrupt") {
      logPlaybackInterrupted(generation, {
        reason,
        discardedSamples: result?.discardedSamples ?? 0,
        framesPublished: result?.framesPublished ?? 0,
      });
    } else {
      logPlaybackEvent("playback_cancelled", { generation, reason });
    }

    return { generation, result };
  }

  /**
   * @param {Buffer} mp3Buffer
   * @param {{ replyChars?: number; voiceTurnNumber?: number }} meta
   */
  async startAsyncPlayback(mp3Buffer, meta = {}) {
    await this.cancelActivePlayback("superseded", { notifyClient: true });

    const generation = ++this.generation;
    const abortController = new AbortController();
    const decodeStartAt = Date.now();
    const pcm = await mp3ToPcm16(mp3Buffer, this.sampleRate);
    const decodeMs = Date.now() - decodeStartAt;
    const expectedDurationMs = pcmDurationMs(pcm, this.sampleRate);

    this.timeline.mark("playback_async_start", {
      generation,
      expectedDurationMs,
      replyChars: meta.replyChars ?? 0,
      voiceTurnNumber: meta.voiceTurnNumber ?? null,
    });

    logPlaybackEvent("▶ Philip playback starting (async)", {
      playbackGeneration: generation,
      expectedDurationMs,
      decodeMs,
      audioPublication: "asynchronous",
    });

    const { firstFramePromise, completion } = startPcmPublishAsync(
      pcm,
      this.audioSource,
      this.sampleRate,
      { signal: abortController.signal },
    );

    this.activePlayback = {
      generation,
      abortController,
      completion,
      cancelled: false,
    };
    this.interruptUsedForGeneration = null;
    this.setState("PHILIP_SPEAKING");
    const playbackStartedAt = Date.now();
    this.interruptMonitor.arm(playbackStartedAt);

    const firstFrameAt = await firstFramePromise;
    const timeToFirstAudioMs = firstFrameAt ? firstFrameAt - playbackStartedAt : null;
    this.timeline.mark("playback_first_frame", {
      generation,
      timeToFirstAudioMs,
      decodeMs,
    });
    logPlaybackEvent("Philip first audio frame queued", {
      playbackGeneration: generation,
      timeToFirstAudioMs,
    });

    void completion.then((result) => {
      if (this.activePlayback?.generation !== generation) return;
      this.activePlayback = null;
      if (result.cancelled) return;
      if (this.loopState === "PHILIP_SPEAKING" || this.loopState === "INTERRUPT_CANDIDATE") {
        this.setState("LISTENING");
      }
      this.timeline.mark("playback_async_complete", {
        generation,
        framesPublished: result.framesPublished,
        pcmDurationMs: result.pcmDurationMs,
      });
      logPlaybackCompleted(generation, {
        framesPublished: result.framesPublished,
        expectedDurationMs,
      });
    }).catch((err) => {
      if (this.activePlayback?.generation !== generation) return;
      this.timeline.mark("playback_async_error", { generation, error: String(err) });
    });

    return {
      generation,
      expectedDurationMs,
      decodeMs,
      timeToFirstAudioMs,
      firstFrameAt,
    };
  }

  /**
   * Synchronous fallback — blocks until all frames are published (legacy).
   */
  async startSyncPlayback(mp3Buffer) {
    await this.cancelActivePlayback("superseded", { notifyClient: false });
    const generation = ++this.generation;
    const publish = await publishMp3ToSource(mp3Buffer, this.audioSource, this.sampleRate, {
      waitForPlayout: true,
      tailWaitMs: 0,
    });
    this.timeline.mark("playback_sync_complete", { generation, ...publish });
    return { generation, ...publish };
  }

  /**
   * @param {Int16Array} samples
   * @returns {Buffer | null}
   */
  handleMicDuringPlayback(samples) {
    if (!this.isPhilipSpeaking()) return null;
    if (this.interruptUsedForGeneration === this.activePlayback?.generation) return null;

    const result = this.interruptMonitor.push(samples);
    if (!result) return null;

    if (result.phase === "candidate_start") {
      this.setState("INTERRUPT_CANDIDATE");
      this.timeline.mark("interruption_candidate_start", {
        generation: this.activePlayback?.generation,
        energy: Math.round(result.energy ?? 0),
      });
      logPlaybackEvent("interruption candidate start", {
        playbackGeneration: this.activePlayback?.generation,
        energy: Math.round(result.energy ?? 0),
      });
      return null;
    }

    if (result.phase === "candidate") {
      return null;
    }

    if (result.phase === "candidate_rejected") {
      if (this.loopState === "INTERRUPT_CANDIDATE") {
        this.setState("PHILIP_SPEAKING");
      }
      this.timeline.mark("interruption_rejected", {
        generation: this.activePlayback?.generation,
        reason: result.reason,
        durationMs: result.durationMs,
        energy: Math.round(result.energy ?? 0),
      });
      logPlaybackEvent("interruption rejected", {
        playbackGeneration: this.activePlayback?.generation,
        reason: result.reason,
        durationMs: result.durationMs,
      });
      return null;
    }

    if (result.phase === "below_threshold" || result.phase === "protected") {
      if (result.phase === "below_threshold" && (result.energy ?? 0) > this.interruptMonitor.config.baseEnergyThreshold) {
        this.timeline.mark("false_vad_during_playback", {
          energy: Math.round(result.energy ?? 0),
          threshold: result.threshold,
        });
      }
      return null;
    }

    if (result.phase === "accepted" && result.utterance) {
      this.interruptUsedForGeneration = this.activePlayback?.generation ?? null;
      this.timeline.mark("interruption_accepted", {
        generation: this.activePlayback?.generation,
        durationMs: result.durationMs,
        energy: Math.round(result.energy ?? 0),
        utteranceBytes: result.utterance.length,
      });
      logPlaybackEvent("interruption accepted", {
        playbackGeneration: this.activePlayback?.generation,
        durationMs: result.durationMs,
        peakEnergy: Math.round(result.peakEnergy ?? 0),
      });
      return result.utterance;
    }

    return null;
  }
}
