# Google Drive Auto-Sync Setup

The website is ready to sync submissions into this Drive folder:

```text
https://drive.google.com/drive/folders/1r20GuBnI0dxaC3n7ac3bCwkwTiCgaEnP?usp=sharing
```

Because a public browser page should not hold private Google credentials, auto-upload needs a small
Google Apps Script or backend endpoint.

## Google Apps Script option

1. Go to Google Drive and create a new Google Apps Script project.
2. Paste the code from `google-drive-upload-webapp.gs`.
3. Deploy it as a Web App.
4. Set access to the audience that should submit stories.
5. Copy the Web App URL.
6. In `app.js`, paste it here:

```js
const DRIVE_UPLOAD_ENDPOINT = "PASTE_WEB_APP_URL_HERE";
```

After that, each new form submission will attempt to upload:

- One JSON file containing student name, grade, school, teachers, story, consent, and timestamp.
- One video file when the student uploaded a video.

## Practical note

Apps Script has size and execution limits. For many large phone videos, a production backend with
Google Drive API, Firebase Storage, Supabase Storage, or S3 is more reliable.
