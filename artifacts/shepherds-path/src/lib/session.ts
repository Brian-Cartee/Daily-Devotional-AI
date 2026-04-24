export function getSessionId(): string {
  let id = localStorage.getItem("sp_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("sp_session_id", id);
  }
  return id;
}
