export function acceptSingleRemoteAudioTrack(currentTrackId, track) {
  if (track?.kind && track.kind !== "audio") {
    return { accepted: false, reason: "non_audio", trackId: currentTrackId };
  }
  const incomingId = String(track?.id || "remote-audio");
  if (currentTrackId && currentTrackId !== incomingId) {
    track?.stop?.();
    return { accepted: false, reason: "duplicate_audio", trackId: currentTrackId };
  }
  return { accepted: true, reason: "accepted", trackId: incomingId };
}
