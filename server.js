const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4173);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_COOKIE = "cs_tuition_admin";
const SUPABASE_URL = stripTrailingSlash(process.env.SUPABASE_URL || "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const HAS_CLOUDINARY = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");
const OPTIONS_FILE = path.join(DATA_DIR, "options.json");
const DEFAULT_OPTIONS = {
  grades: [
    "二年级",
    "三年级",
    "四年级",
    "五年级",
    "六年级",
    "FORM 1",
    "FORM 2",
    "FORM 3",
    "FORM 4",
    "FORM 5",
  ],
  teachers: [
    "BOBO",
    "DR. CS WONG",
    "MABEL CHOONG",
    "DR ONG",
    "WEI WEI",
    "CALVIN TEOH",
    "陈国良",
    "S.H. LIM",
    "MS ONG",
    "C.L. LIEW",
    "MISS YEOH",
    "BX KHOO",
    "何老师",
    "J.S. ONG",
    "WILLIAM TAN",
    "NATHAN OOI",
    "KHOO",
    "K.Y. SOON",
    "SELINE LOO",
    "H.H. THOR",
    "DOREEN",
    "GEORGE LEE",
    "AUDREY",
    "T.Y. GAN",
    "SIR LOH",
    "LILY CHEAH",
    "C.K. TAN",
    "华老师",
    "H.T. LEE",
    "YZ KOAY",
    "小蔡老师",
    "W.Z. LEONG",
    "WM LAU",
    "TEACHER AA",
    "MACIA",
  ],
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
const adminSessions = new Set();

ensureStorage();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/health") {
      sendJson(res, {
        ok: true,
        storage: HAS_SUPABASE ? "supabase" : "local",
        videoStorage: HAS_CLOUDINARY ? "cloudinary" : "local",
      });
      return;
    }

    if (url.pathname === "/api/admin/login" && req.method === "POST") {
      const payload = await readJsonBody(req);
      if (!ADMIN_PASSWORD) {
        sendJson(res, { ok: false, error: "Admin password is not configured" }, 500);
        return;
      }
      if (payload.password !== ADMIN_PASSWORD) {
        sendJson(res, { ok: false, error: "Invalid password" }, 401);
        return;
      }

      const token = crypto.randomBytes(32).toString("hex");
      adminSessions.add(token);
      res.setHeader("Set-Cookie", buildAdminCookie(req, token, 28800));
      sendJson(res, { ok: true });
      return;
    }

    if (url.pathname === "/api/admin/logout" && req.method === "POST") {
      const token = getAdminToken(req);
      if (token) adminSessions.delete(token);
      res.setHeader("Set-Cookie", buildAdminCookie(req, "", 0));
      sendJson(res, { ok: true });
      return;
    }

    if (url.pathname === "/api/admin/me") {
      sendJson(res, { authenticated: isAdmin(req) });
      return;
    }

    if (url.pathname === "/api/options" && req.method === "GET") {
      sendJson(res, await readOptions());
      return;
    }

    if (url.pathname === "/api/options" && req.method === "PUT") {
      if (!isAdmin(req)) {
        sendJson(res, { error: "Admin login required" }, 401);
        return;
      }
      const payload = await readJsonBody(req);
      await writeOptions({
        grades: sanitizeOptionList(payload.grades, DEFAULT_OPTIONS.grades),
        teachers: sanitizeOptionList(payload.teachers, DEFAULT_OPTIONS.teachers),
      });
      sendJson(res, await readOptions());
      return;
    }

    if (url.pathname === "/api/submissions" && req.method === "GET") {
      const submissions = await readSubmissions();
      sendJson(res, isAdmin(req) ? submissions.map(toAdminSubmission) : submissions.map(toLeaderboardSubmission));
      return;
    }

    if (url.pathname === "/api/submissions" && req.method === "POST") {
      const payload = await readJsonBody(req);
      const saved = await saveServerSubmission(payload);
      sendJson(res, toLeaderboardSubmission(saved), 201);
      return;
    }

    if (url.pathname === "/api/submissions" && req.method === "DELETE") {
      if (!isAdmin(req)) {
        sendJson(res, { error: "Admin login required" }, 401);
        return;
      }
      await clearSubmissionStorage();
      sendJson(res, { ok: true });
      return;
    }

    if (url.pathname.startsWith("/uploads/")) {
      if (!isAdmin(req)) {
        sendText(res, "Admin login required", 401);
        return;
      }
      serveUpload(url.pathname, res);
      return;
    }

    serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    sendJson(res, { error: "Server error" }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`CS Tuition website running at http://127.0.0.1:${PORT}`);
});

function ensureStorage() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, "[]");
  }
  if (!fs.existsSync(OPTIONS_FILE)) {
    fs.writeFileSync(OPTIONS_FILE, JSON.stringify(DEFAULT_OPTIONS, null, 2));
  }
}

async function readSubmissions() {
  if (HAS_SUPABASE) {
    const rows = await supabaseRequest("/submissions?select=*&order=created_at.desc");
    return rows.map(fromSupabaseSubmission);
  }

  return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf8"));
}

function writeLocalSubmissions(submissions) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

async function readOptions() {
  if (HAS_SUPABASE) {
    const rows = await supabaseRequest("/site_options?select=key,value");
    if (!rows.length) {
      await writeOptions(DEFAULT_OPTIONS);
      return DEFAULT_OPTIONS;
    }

    const options = { ...DEFAULT_OPTIONS };
    rows.forEach((row) => {
      if (row.key === "grades") options.grades = sanitizeOptionList(row.value, DEFAULT_OPTIONS.grades);
      if (row.key === "teachers") options.teachers = sanitizeOptionList(row.value, DEFAULT_OPTIONS.teachers);
    });
    return options;
  }

  return JSON.parse(fs.readFileSync(OPTIONS_FILE, "utf8"));
}

async function writeOptions(options) {
  if (HAS_SUPABASE) {
    await supabaseRequest("/site_options?on_conflict=key", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([
        { key: "grades", value: options.grades },
        { key: "teachers", value: options.teachers },
      ]),
    });
    return;
  }

  fs.writeFileSync(OPTIONS_FILE, JSON.stringify(options, null, 2));
}

function sanitizeOptionList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

async function clearSubmissionStorage() {
  if (HAS_SUPABASE) {
    await supabaseRequest("/submissions?id=not.is.null", { method: "DELETE" });
    return;
  }

  writeLocalSubmissions([]);
  fs.readdirSync(UPLOAD_DIR).forEach((fileName) => {
    fs.unlinkSync(path.join(UPLOAD_DIR, fileName));
  });
}

async function saveServerSubmission(payload) {
  const submission = {
    id: payload.id,
    createdAt: payload.createdAt || Date.now(),
    studentName: payload.studentName,
    grade: payload.grade,
    school: payload.school,
    teachers: Array.isArray(payload.teachers) ? payload.teachers : [],
    story: payload.story || "",
    consent: Boolean(payload.consent),
    driveStatus: payload.driveStatus || "Saved to CS Tuition server",
    video: null,
  };

  if (payload.video?.base64) {
    submission.video = HAS_CLOUDINARY
      ? await saveCloudinaryVideo(payload.video, submission)
      : saveLocalVideo(payload.video, submission);
  }

  if (HAS_SUPABASE) {
    await supabaseRequest("/submissions", {
      method: "POST",
      body: JSON.stringify(toSupabaseSubmission(submission)),
    });
    return submission;
  }

  const submissions = await readSubmissions();
  submissions.unshift(submission);
  writeLocalSubmissions(submissions);
  return submission;
}

function saveLocalVideo(video, submission) {
  const originalName = video.name || "video.mp4";
  const extension = path.extname(originalName) || ".mp4";
  const fileName = `${safeFilePart(submission.createdAt)}_${safeFilePart(submission.id)}${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, Buffer.from(video.base64, "base64"));
  return {
    name: originalName,
    fileName,
    type: video.type || "application/octet-stream",
    size: video.size || fs.statSync(filePath).size,
    storage: "local",
  };
}

async function saveCloudinaryVideo(video, submission) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "cs-tuition-thank-you";
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&public_id=${submission.id}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest("hex");
  const form = new FormData();
  form.append("file", `data:${video.type || "video/mp4"};base64,${video.base64}`);
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", submission.id);
  form.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  const result = await response.json();
  return {
    name: video.name || `${submission.id}.${result.format || "mp4"}`,
    fileName: result.public_id,
    type: video.type || `video/${result.format || "mp4"}`,
    size: result.bytes || video.size || 0,
    storage: "cloudinary",
    publicId: result.public_id,
    downloadUrl: result.secure_url,
  };
}

function toAdminSubmission(submission) {
  return {
    ...submission,
    video: submission.video
      ? {
          ...submission.video,
          downloadUrl: submission.video.downloadUrl || `/uploads/${encodeURIComponent(submission.video.fileName)}`,
        }
      : null,
  };
}

function toLeaderboardSubmission(submission) {
  return {
    id: submission.id,
    createdAt: submission.createdAt,
    teachers: submission.teachers,
  };
}

function isAdmin(req) {
  const token = getAdminToken(req);
  return Boolean(token && adminSessions.has(token));
}

function getAdminToken(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[ADMIN_COOKIE];
}

function parseCookies(cookieHeader) {
  return cookieHeader.split(";").reduce((cookies, item) => {
    const [rawKey, ...rawValue] = item.trim().split("=");
    if (!rawKey) return cookies;
    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

function buildAdminCookie(req, token, maxAge) {
  const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${errorText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

function toSupabaseSubmission(submission) {
  return {
    id: submission.id,
    created_at: submission.createdAt,
    student_name: submission.studentName,
    grade: submission.grade,
    school: submission.school,
    teachers: submission.teachers,
    story: submission.story,
    consent: submission.consent,
    drive_status: submission.driveStatus,
    video: submission.video,
  };
}

function fromSupabaseSubmission(row) {
  return {
    id: row.id,
    createdAt: Number(row.created_at),
    studentName: row.student_name,
    grade: row.grade,
    school: row.school,
    teachers: Array.isArray(row.teachers) ? row.teachers : [],
    story: row.story || "",
    consent: Boolean(row.consent),
    driveStatus: row.drive_status,
    video: row.video,
  };
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, "");
}

function safeFilePart(value) {
  return String(value || "file").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 150 * 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(JSON.parse(body || "{}")));
    req.on("error", reject);
  });
}

function serveUpload(requestPath, res) {
  const fileName = decodeURIComponent(requestPath.replace("/uploads/", ""));
  const filePath = path.join(UPLOAD_DIR, path.basename(fileName));
  if (!fs.existsSync(filePath)) {
    sendText(res, "Not found", 404);
    return;
  }
  res.writeHead(200, {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`,
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveStatic(requestPath, res) {
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(ROOT, cleanPath));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, "Not found", 404);
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, text, status = 200) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}
