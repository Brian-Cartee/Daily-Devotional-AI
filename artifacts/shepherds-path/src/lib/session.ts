let memorySessionId: string | null = null;

export function getSessionId(): string {
  try {
    let id = localStorage.getItem("sp_session_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sp_session_id", id);
    }
    memorySessionId = id;
    return id;
  } catch {
    if (!memorySessionId) memorySessionId = crypto.randomUUID();
    return memorySessionId;
  }
}
