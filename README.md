# CS Tuition Teacher Appreciation Upload Website

This is a static prototype for collecting student appreciation videos and written stories.

## What it includes

- Student upload form for name, grade, school, teacher names, written story, video, and consent.
- Live teacher leaderboard based on how many students thanked each teacher.
- Admin view for filtering by submission date, then downloading CSV, JSON, individual videos, and all matching videos.
- Google Drive auto-sync hook for the CS Tuition Drive folder.
- Admin password gate before downloads are visible.
- Admin settings for adding new Grade / Level options and Teacher Names shown in the student form.
- Admin can reorder Grade / Level and Teacher options; deletion requires typing `confirm delete`.
- Visual styling adapted toward the CS Corporate Identity Playbook: official logo asset, blue/gold/pink palette, and Montserrat typography.

## Run locally

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4173
```

## Important note

Submissions are stored in the browser's local IndexedDB for this prototype. For real public launch,
connect the form to a backend with admin login, cloud video storage, consent tracking, and backups.

When running with `node server.js`, submissions are saved into `data/submissions.json` and videos
are saved under `data/uploads`, so all visitors using the same shared link see the same leaderboard.

See `BACKEND_SETUP.md` for the Google Drive auto-sync setup.
See `DEPLOYMENT.md` for online deployment notes.

## Prototype admin password

The demo admin password is set in `app.js`:

```js
const ADMIN_PASSWORD = "CSTuitionAdmin2026!";
```

This hides the admin download area from normal visitors, but it is still front-end protection. For a
real launch, protect the Drive folder, backend upload endpoint, and download endpoints with proper
server-side authentication.
