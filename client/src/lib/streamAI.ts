export async function streamAI(
  url: string,
  body: object,
  onUpdate: (text: string) => void,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.message) msg = errData.message;
    } catch {}
    throw new Error(msg);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onUpdate(text);
  }

  return text;
}
