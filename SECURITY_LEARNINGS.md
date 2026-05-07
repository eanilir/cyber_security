# Security Learnings (from this project)

## 1) Local file vs HTTP server
- Browser `fetch()` calls for local JSON can fail on `file://` pages.
- Running with `http://localhost` fixes `Failed to fetch` for `data/users.json`.
- Practical rule: always run dashboard projects with a local server.

## 2) Log noise must be controlled
- A single attack action can trigger multiple logs from different layers.
- If every sub-check logs aggressively, the panel becomes noisy.
- Better approach: keep critical logs, reduce duplicate informational logs.

## 3) Realistic attack simulation policy
- Victim account lock and attacker IP block at the same time can be too aggressive.
- More realistic model:
  - Keep victim as `suspicious` / `under attack`.
  - Block attacker IP (or source profile) based on behavior.
  - Avoid locking victim account for non-auth attack types.

## 4) Better UX for attacker simulation
- Triggering attack immediately on button click can be confusing.
- Better flow:
  - Select attacker user.
  - Select target user.
  - Select attack type.
  - Execute action.

## 5) Layered defense is the real-world pattern
- Temporary block alone is not enough.
- Use multiple controls together:
  - progressive block durations,
  - rate limiting,
  - MFA/CAPTCHA on risky attempts,
  - behavior-based detection,
  - edge protection (WAF/CDN),
  - monitoring + auto-response.

## 6) Portfolio-ready engineering notes
- Every security rule should explain:
  - what it protects,
  - what it may break,
  - how it is validated.
- This improves both code quality and interview storytelling.
