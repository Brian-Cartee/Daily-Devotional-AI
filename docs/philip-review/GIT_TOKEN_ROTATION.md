# GitHub Token Rotation (Mac + Lightsail)

When `git push` fails with *Invalid username or token*, rotate your classic PAT.

## 1. Create a new token

1. Open https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Name: e.g. `git classic token 2026-07`
4. Expiration: 90 days or 1 year
5. Scope: **`repo`** only (unless you need more)
6. Copy the token immediately

## 2. Update your Mac

Old keychain entry was cleared. Push once to store the new token:

```bash
cd ~/Daily-Devotional-AI
git push origin spike/philip-voice-lab
```

When prompted:
- **Username:** `Brian-Cartee`
- **Password:** paste the **token** (not your GitHub password)

## 3. Update Lightsail (if deploy `git fetch` fails)

```bash
ssh -i ~/Desktop/LightsailDefaultKey-us-west-2.pem ubuntu@52.42.155.185
cd ~/Daily-Devotional-AI
git fetch origin
```

If fetch fails, update `~/.git-credentials` on the server or re-run the credential helper flow with the new token.

## 4. Revoke the old token

https://github.com/settings/tokens → delete **new git classic token 7-9-26**
