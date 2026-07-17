# Phase 2 Manual Canary — Brian operating instructions

**Status:** unpaid preparation only. Attempt **3 of 3** remains unused. Spend **$0**.

## What this is

A local browser page that validates your real microphone and silence detection **without** contacting OpenAI. The paid “Begin Authorized Realtime Canary” control stays **disabled** until you explicitly authorize Attempt 3 later.

## Start the local server

```bash
cd /Users/briancartee/philip-lab-worktrees/philip-realtime-core-v1/artifacts/philip-realtime-core
npm run phase2:manual-server
```

Open the printed URL, or:

[http://127.0.0.1:4317/manual-canary](http://127.0.0.1:4317/manual-canary)

Do **not** set `ALLOW_ATTEMPT3=1` during preparation.

## Operate the page

1. Confirm the red banner: **Attempt 3 of 3 — paid connection not started**.
2. Confirm **Begin Authorized Realtime Canary** is disabled.
3. Click **Test Microphone Locally** and allow microphone access.
4. Speak a normal sentence; watch **speech detected: yes** and the level meter move.
5. Stay quiet for at least **1.5 seconds**; watch **silence detected: yes**.
6. Click **Emergency Stop** to close the mic track.
7. Confirm **provider requests: 0**.

No audio is recorded or written to disk.

## What not to do

- Do not enable Attempt 3 until Brian explicitly authorizes it.
- Do not push, deploy, or start Sessions 2/3.
- Do not paste API keys into the browser or chat.
