# Classroom Browser

A teacher-managed, allowlist-based browsing app for classrooms. Students can only visit sites the teacher approves. The teacher dashboard is password-protected and lets you add, remove, or reorder sites.

## Architecture

- **Teacher side** (`/teacher/`) — Dashboard to manage the approved site list, set the exit PIN, and generate an encrypted config blob.
- **Student side** (`/student/`) — A kiosk-style browser that only allows approved sites. The config is an encrypted blob; the PIN is never sent to any server.
- **No server needed.** Everything runs client-side. Host on GitHub Pages, Cloudflare Pages, or any static host.

## How it works

1. The teacher visits `/teacher/`, enters the PIN, and edits the site list.
2. The teacher clicks **Export Config** — this downloads a `config.js` file.
3. The teacher replaces the `config.js` in the `/student/` folder with the new one.
4. Students visit `/student/` and can only browse the approved sites.

### Security model

- The site list is **encrypted** with AES-GCM using a key derived from the PIN via PBKDF2 (250,000 iterations).
- The encrypted blob is stored in `config.js` — there's no server to attack.
- The PIN is never hardcoded in plaintext; it's always derived from the encrypted blob.
- **This is not a security guarantee** — determined students can still use OS features (task switcher, etc.). Fullscreen mode is **not** a sandbox. For true lockdown, use your school's kiosk software.

## Hosting

### Cloudflare Pages (recommended)
1. Push the repo to GitHub.
2. Connect the repo to Cloudflare Pages.
3. Build settings: no build step needed — "Publish directory: ."
4. The `_headers` file will be automatically applied.

### GitHub Pages
1. Push to a GitHub repo.
2. Enable Pages in repo settings (branch: main, folder: root).
3. The `_headers` file won't be applied — you'll need to add headers via GitHub Actions or accept slightly weaker headers.
4. Add a `CNAME` file if using a custom domain.

### Netlify / Vercel / Surge
- Any static host works. Upload the entire repo as a zip, or connect your GitHub repo.
- If the host supports custom headers (Netlify has `_headers`, Vercel has `vercel.json`), add the same headers from `_headers`.

## Files

| File | Purpose |
|---|---|
| `_headers` | Security headers for Cloudflare Pages |
| `assets/style.css` | Shared CSS for teacher + student pages |
| `crypto.js` | AES-GCM + PBKDF2 encryption module (used by both) |
| `teacher/index.html` | Teacher dashboard |
| `teacher/teacher.js` | Teacher dashboard logic |
| `student/index.html` | Student kiosk entry page |
| `student/config.js` | Encrypted site configuration (replace this) |
| `student/student.js` | Student kiosk logic |
| `404.html` | Custom 404 page |

## Default PIN

The default PIN is **1234**. Change it in the teacher dashboard. After exporting, you won't be able to decrypt the config if you lose the PIN — make sure you remember it!

## Known limitations

- Wikipedia works best via its mobile embed template. Full Wikipedia may not load in an iframe.
- Khan Academy does not support iframe embedding — students will open it in the main window.
- GeoGebra works via material ID (e.g., `geogebra.org/m/abc123`).
- Fullscreen re-entry is best-effort; some browsers won't allow it after user presses Esc.
- Right-click and keyboard shortcuts are blocked but can be bypassed with OS shortcuts.
