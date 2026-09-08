# n8n-nodes-grain

<p>
  <a href="https://www.npmjs.com/package/n8n-nodes-grain"><img alt="npm version" src="https://img.shields.io/npm/v/n8n-nodes-grain.svg"></a>
  <a href="https://www.npmjs.com/package/n8n-nodes-grain"><img alt="downloads" src="https://img.shields.io/npm/dm/n8n-nodes-grain.svg"></a>
  <img alt="license" src="https://img.shields.io/npm/l/n8n-nodes-grain.svg">
</p>

An [n8n](https://n8n.io) **community node** for [Grain](https://grain.com) — the AI meeting recorder and note‑taker.

Pull recordings, transcripts, highlights and AI summaries into your workflows, manage tags and
sharing, and kick off automations the moment a meeting is recorded — all without writing a single
HTTP Request node.

- 🎥 **Recordings** — list, fetch, rename, tag, and share
- 📝 **Transcripts** — JSON, plain text, VTT, or SRT
- 🤖 **AI data** — summaries, action items, highlights, participants
- ⚡ **Real‑time triggers** — start workflows on 10 Grain webhook events
- 👥 **Directory** — look up users, teams, and meeting types

---

## Table of contents

- [Installation](#installation)
- [Credentials](#credentials)
- [Nodes & operations](#nodes--operations)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [Resources](#resources)
- [License](#license)

---

## Installation

### From the n8n UI (self‑hosted)

1. Go to **Settings → Community Nodes → Install**.
2. Enter `n8n-nodes-grain` and confirm.

> Community nodes require `N8N_COMMUNITY_PACKAGES_ENABLED=true` (the default for self‑hosted). n8n
> also gates non‑verified packages behind `N8N_UNVERIFIED_PACKAGES_ENABLED` — make sure it is `true`.

### Via npm (manual / Docker images)

```bash
npm install n8n-nodes-grain
```

---

## Credentials

You need a Grain **access token**.

1. In Grain, open **Settings → Integrations → API**.
2. Create one of:
   - **Personal Access Token (PAT)** — acts as you, with your permissions.
   - **Workspace Access Token (WAT)** — workspace‑wide (admin only, Business/Enterprise plans).
3. In n8n, add a **Grain API** credential and paste the token.

The credential also exposes two advanced fields you normally won't touch:

| Field | Default | Purpose |
| --- | --- | --- |
| **API Version** | `2025-10-31` | Sent as the required `Public-Api-Version` header |
| **Base URL** | `https://api.grain.com` | Only change if instructed by Grain |

The credential's **Connection test** verifies your token against the live API before you save it.

---

## Nodes & operations

### 🟣 Grain

| Resource | Operations |
| --- | --- |
| **Recording** | Get Many · Get · Get Transcript · Update · Add Tag · Remove Tag · Share With User · Unshare From User |
| **User** | Get Many |
| **Team** | Get Many |
| **Meeting Type** | Get Many |

**Get Many (Recording)** supports server‑side **filters** — recorded before/after, participant scope
(internal/external), title search, team, and meeting type — plus automatic cursor pagination when
*Return All* is enabled.

**Include** (on *Get* and *Get Many*) expands each recording with any of: highlights, participants,
AI summary, AI action items, calendar event, screenshares.

**Get Transcript** returns the transcript as structured **JSON** (with speakers and timestamps) or as
**Plain Text / VTT / SRT** for captioning and downstream tooling.

### 🟣 Grain Trigger

Starts a workflow the moment Grain fires an event. Select one or more:

`recording_added` · `recording_updated` · `recording_deleted` ·
`highlight_added` · `highlight_updated` · `highlight_deleted` ·
`story_added` · `story_updated` · `story_deleted` · `upload_status`

The node **registers a Grain webhook per selected event** when the workflow is activated and
**removes them automatically** when it is deactivated — no manual webhook cleanup. Use **Include** to
have Grain embed summaries, highlights, participants, etc. directly in the event payload.

---

## Example workflows

**Post every new meeting summary to Slack**

```
Grain Trigger (recording_added, include: AI Summary)
        │
        ▼
Slack → Send message  →  {{$json.data.ai_summary}}
```

**Archive transcripts to Google Drive nightly**

```
Schedule Trigger (daily)
        │
        ▼
Grain → Recording: Get Many (Return All, recorded after = yesterday)
        │
        ▼
Grain → Recording: Get Transcript (SRT)
        │
        ▼
Google Drive → Upload
```

---

## Compatibility

- n8n with community‑node support (`N8N_COMMUNITY_PACKAGES_ENABLED=true`).
- Built and tested against the Grain public API version **`2025-10-31`**.
- Node.js **20+**.

---

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Grain API documentation](https://developers.grain.com/)
- [Grain](https://grain.com)

---

## License

[MIT](LICENSE.md) © Mantas M.
