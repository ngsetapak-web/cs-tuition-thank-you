const DB_NAME = "cs-tuition-stories";
const DB_VERSION = 1;
const STORE_NAME = "submissions";
const DRIVE_FOLDER_ID = "1r20GuBnI0dxaC3n7ac3bCwkwTiCgaEnP";
const DRIVE_UPLOAD_ENDPOINT = "";
const ADMIN_SESSION_KEY = "cs-tuition-admin-unlocked";
const GRADE_OPTIONS_KEY = "cs-tuition-grade-options";
const TEACHER_OPTIONS_KEY = "cs-tuition-teacher-options";
const SERVER_API_BASE = "";

const defaultGradeOptions = [
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
];
const defaultTeacherOptions = [
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
];
let submissions = [];
let gradeOptions = loadOptions(GRADE_OPTIONS_KEY, defaultGradeOptions);
let teacherOptions = loadOptions(TEACHER_OPTIONS_KEY, defaultTeacherOptions);
let db;
let serverMode = false;

const els = {
  tabs: document.querySelectorAll(".tab-button"),
  viewButtons: document.querySelectorAll("[data-view]"),
  views: document.querySelectorAll(".view"),
  menuToggle: document.querySelector("#menu-toggle"),
  mainNav: document.querySelector("#main-nav"),
  form: document.querySelector("#story-form"),
  formSteps: document.querySelectorAll(".form-step"),
  formNextButtons: document.querySelectorAll(".form-next"),
  formBackButtons: document.querySelectorAll(".form-back"),
  formProgress: document.querySelector("#form-progress"),
  mobileProgress: document.querySelector("#mobile-progress"),
  reviewCard: document.querySelector("#review-card"),
  submitStoryButton: document.querySelector("#submit-story-button"),
  gradeSelect: document.querySelector("#grade-select"),
  teacherOptions: document.querySelector("#teacher-options"),
  fileInput: document.querySelector("#video-file"),
  fileName: document.querySelector("#file-name"),
  formNote: document.querySelector("#form-note"),
  clearForm: document.querySelector("#clear-form"),
  leaderboardMini: document.querySelector("#leaderboard-mini"),
  leaderboardFull: document.querySelector("#leaderboard-full"),
  leaderboardRanking: document.querySelector("#leaderboard-ranking"),
  rankingTotal: document.querySelector("#ranking-total"),
  rankingTeacherTotal: document.querySelector("#ranking-teacher-total"),
  rows: document.querySelector("#submission-rows"),
  adminLoginPanel: document.querySelector("#admin-login-panel"),
  adminContent: document.querySelector("#admin-content"),
  adminLoginForm: document.querySelector("#admin-login-form"),
  adminPassword: document.querySelector("#admin-password"),
  adminLoginNote: document.querySelector("#admin-login-note"),
  adminLogout: document.querySelector("#admin-logout"),
  exportCsv: document.querySelector("#export-csv"),
  exportJson: document.querySelector("#export-json"),
  downloadAllVideos: document.querySelector("#download-all-videos"),
  filterFrom: document.querySelector("#filter-from"),
  filterTo: document.querySelector("#filter-to"),
  clearFilters: document.querySelector("#clear-filters"),
  driveSyncNote: document.querySelector("#drive-sync-note"),
  clearAll: document.querySelector("#clear-all"),
  gradeOptionForm: document.querySelector("#grade-option-form"),
  teacherOptionForm: document.querySelector("#teacher-option-form"),
  newGradeOption: document.querySelector("#new-grade-option"),
  newTeacherOption: document.querySelector("#new-teacher-option"),
  gradeOptionList: document.querySelector("#grade-option-list"),
  teacherOptionList: document.querySelector("#teacher-option-list"),
  metricSubmissions: document.querySelector("#metric-submissions"),
  metricVideos: document.querySelector("#metric-videos"),
  metricTeachers: document.querySelector("#metric-teachers"),
  emptyTemplate: document.querySelector("#empty-state-template"),
};

let currentFormStep = 0;

function loadOptions(storageKey, defaults) {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return [...defaults];

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch (error) {
    console.warn(`Unable to load ${storageKey}`, error);
  }

  return [...defaults];
}

function saveOptions(storageKey, options) {
  localStorage.setItem(storageKey, JSON.stringify(options));
}

async function loadServerOptions() {
  if (!serverMode) return;

  try {
    const response = await fetch(`${SERVER_API_BASE}/api/options`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load options");
    const options = await response.json();
    gradeOptions = Array.isArray(options.grades) && options.grades.length ? options.grades : gradeOptions;
    teacherOptions = Array.isArray(options.teachers) && options.teachers.length ? options.teachers : teacherOptions;
    saveOptions(GRADE_OPTIONS_KEY, gradeOptions);
    saveOptions(TEACHER_OPTIONS_KEY, teacherOptions);
  } catch (error) {
    console.warn("Using local form options", error);
  }
}

async function persistOptionSettings() {
  saveOptions(GRADE_OPTIONS_KEY, gradeOptions);
  saveOptions(TEACHER_OPTIONS_KEY, teacherOptions);

  if (!serverMode || !isAdminUnlocked()) return;

  try {
    await fetch(`${SERVER_API_BASE}/api/options`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        grades: gradeOptions,
        teachers: teacherOptions,
      }),
    });
  } catch (error) {
    window.alert("Options saved locally, but failed to sync to the shared server.");
  }
}

function normalizeOption(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function addOption(type, value) {
  const nextValue = normalizeOption(value);
  if (!nextValue) return;

  const isGrade = type === "grade";
  const options = isGrade ? gradeOptions : teacherOptions;
  const exists = options.some((option) => option.toLowerCase() === nextValue.toLowerCase());
  if (exists) return;

  options.push(nextValue);
  persistOptionSettings();
  renderOptionControls();
  renderAll();
}

function removeOption(type, value) {
  const confirmation = window.prompt(
    `Type "confirm delete" to delete "${value}" from the ${type === "grade" ? "Grade / Level" : "Teacher Names"} options.`,
  );

  if (confirmation !== "confirm delete") {
    return;
  }

  const isGrade = type === "grade";
  if (isGrade) {
    gradeOptions = gradeOptions.filter((option) => option !== value);
  } else {
    teacherOptions = teacherOptions.filter((option) => option !== value);
  }
  persistOptionSettings();
  renderOptionControls();
  renderAll();
}

function moveOption(type, value, direction) {
  const isGrade = type === "grade";
  const options = isGrade ? gradeOptions : teacherOptions;
  const currentIndex = options.indexOf(value);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= options.length) {
    return;
  }

  [options[currentIndex], options[nextIndex]] = [options[nextIndex], options[currentIndex]];

  persistOptionSettings();

  renderOptionControls();
  renderAll();
}

function renderOptionControls() {
  renderGradeSelect();
  renderTeacherChoices();
  renderAdminOptionList("grade", gradeOptions, els.gradeOptionList);
  renderAdminOptionList("teacher", teacherOptions, els.teacherOptionList);
}

function renderGradeSelect() {
  if (!els.gradeSelect) return;
  const currentValue = els.gradeSelect.value;
  els.gradeSelect.innerHTML = `<option value="">Choose grade / level</option>`;
  gradeOptions.forEach((grade) => {
    const option = document.createElement("option");
    option.value = grade;
    option.textContent = grade;
    els.gradeSelect.append(option);
  });
  if (gradeOptions.includes(currentValue)) {
    els.gradeSelect.value = currentValue;
  }
}

function renderTeacherChoices() {
  if (!els.teacherOptions) return;
  const selected = new Set(
    [...els.teacherOptions.querySelectorAll("input:checked")].map((input) => input.value),
  );
  els.teacherOptions.innerHTML = "";
  teacherOptions.forEach((teacher) => {
    const label = document.createElement("label");
    label.className = "teacher-choice";
    label.innerHTML = `
      <input type="checkbox" name="teachers" value="${escapeHtml(teacher)}" />
      <span>${escapeHtml(teacher)}</span>
    `;
    label.querySelector("input").checked = selected.has(teacher);
    els.teacherOptions.append(label);
  });
}

function renderAdminOptionList(type, options, target) {
  if (!target) return;
  target.innerHTML = "";
  options.forEach((option, index) => {
    const item = document.createElement("span");
    item.className = "option-chip";
    item.innerHTML = `
      <span class="option-name">${escapeHtml(option)}</span>
      <span class="option-chip-actions">
        <button
          type="button"
          aria-label="Move ${escapeHtml(option)} earlier"
          data-option-action="move-up"
          data-option-type="${type}"
          data-option-value="${escapeHtml(option)}"
          ${index === 0 ? "disabled" : ""}
        >‹</button>
        <button
          type="button"
          aria-label="Move ${escapeHtml(option)} later"
          data-option-action="move-down"
          data-option-type="${type}"
          data-option-value="${escapeHtml(option)}"
          ${index === options.length - 1 ? "disabled" : ""}
        >›</button>
        <button
          type="button"
          aria-label="Remove ${escapeHtml(option)}"
          data-option-action="delete"
          data-option-type="${type}"
          data-option-value="${escapeHtml(option)}"
        >×</button>
      </span>
    `;
    target.append(item);
  });
}

function isAdminUnlocked() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function setAdminUnlocked(isUnlocked) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, String(isUnlocked));
  renderAdminAccess();
}

function renderAdminAccess() {
  if (!els.adminLoginPanel || !els.adminContent) return;
  const isUnlocked = isAdminUnlocked();
  els.adminLoginPanel.classList.toggle("locked", isUnlocked);
  els.adminContent.classList.toggle("locked", !isUnlocked);
  els.adminContent.setAttribute("aria-hidden", String(!isUnlocked));
  els.adminLoginPanel.setAttribute("aria-hidden", String(isUnlocked));
}

function requireAdminAccess() {
  if (isAdminUnlocked()) return true;
  window.alert("Please log in as admin before downloading素材.");
  renderAdminAccess();
  return false;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const nextDb = request.result;
      if (!nextDb.objectStoreNames.contains(STORE_NAME)) {
        nextDb.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbTransaction(mode = "readonly") {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

function getAllSubmissions() {
  if (serverMode) {
    return fetch(`${SERVER_API_BASE}/api/submissions`, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to fetch server submissions");
        return response.json();
      })
      .then((items) => items.sort((a, b) => b.createdAt - a.createdAt));
  }

  return new Promise((resolve, reject) => {
    const request = dbTransaction().getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
}

function saveSubmission(submission) {
  if (serverMode) {
    return saveServerSubmission(submission);
  }

  return new Promise((resolve, reject) => {
    const request = dbTransaction("readwrite").put(submission);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearSubmissions() {
  if (serverMode) {
    return fetch(`${SERVER_API_BASE}/api/submissions`, {
      method: "DELETE",
      credentials: "same-origin",
    }).then((response) => {
      if (!response.ok) throw new Error("Unable to clear server submissions");
    });
  }

  return new Promise((resolve, reject) => {
    const request = dbTransaction("readwrite").clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function detectServerMode() {
  try {
    const response = await fetch(`${SERVER_API_BASE}/api/health`, { cache: "no-store" });
    serverMode = response.ok;
  } catch (error) {
    serverMode = false;
  }
}

async function syncServerAdminStatus() {
  if (!serverMode) return;

  try {
    const response = await fetch(`${SERVER_API_BASE}/api/admin/me`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await response.json();
    sessionStorage.setItem(ADMIN_SESSION_KEY, String(Boolean(data.authenticated)));
  } catch (error) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "false");
  }
}

async function loginAdmin(password) {
  if (!serverMode) {
    throw new Error("Admin login requires the website server. Please run npm start.");
  }

  const response = await fetch(`${SERVER_API_BASE}/api/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error("Incorrect password. Please try again.");
  }

  setAdminUnlocked(true);
}

async function logoutAdmin() {
  if (serverMode) {
    await fetch(`${SERVER_API_BASE}/api/admin/logout`, {
      method: "POST",
      credentials: "same-origin",
    });
  }
  setAdminUnlocked(false);
  await refresh();
}

async function saveServerSubmission(submission) {
  const payload = {
    ...submission,
    video: null,
  };

  if (submission.video?.blob) {
    payload.video = {
      name: submission.video.name,
      type: submission.video.type,
      size: submission.video.size,
      base64: await blobToBase64(submission.video.blob),
    };
  }

  const response = await fetch(`${SERVER_API_BASE}/api/submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to save submission to server");
  }
}

function parseTeachers(value) {
  return value
    .split(",")
    .map((teacher) => teacher.trim())
    .filter(Boolean);
}

function getLeaderboard() {
  const teacherCounts = new Map(teacherOptions.map((teacher) => [teacher, 0]));

  submissions.forEach((submission) => {
    submission.teachers.forEach((teacher) => {
      teacherCounts.set(teacher, (teacherCounts.get(teacher) || 0) + 1);
    });
  });

  return [...teacherCounts.entries()]
    .map(([teacher, count]) => ({ teacher, count }))
    .filter((entry) => entry.count > 0 || submissions.length === 0)
    .sort((a, b) => b.count - a.count || a.teacher.localeCompare(b.teacher));
}

function renderLeaderboard(target, limit) {
  const leaderboard = getLeaderboard().slice(0, limit);
  target.innerHTML = "";

  if (!submissions.length) {
    target.append(els.emptyTemplate.content.cloneNode(true));
    return;
  }

  leaderboard.forEach((entry) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>
        <strong>${escapeHtml(entry.teacher)}</strong>
        <small>${entry.count === 1 ? "1 student appreciation" : `${entry.count} student appreciations`}</small>
      </span>
      <span class="score">${entry.count}</span>
    `;
    target.append(li);
  });
}

function renderAdmin() {
  if (!els.rows) return;
  if (!isAdminUnlocked()) {
    return;
  }

  const filtered = getFilteredSubmissions();

  els.rows.innerHTML = "";
  els.metricSubmissions.textContent = filtered.length;
  els.metricVideos.textContent = filtered.filter((item) => item.video).length;
  els.metricTeachers.textContent = new Set(filtered.flatMap((item) => item.teachers)).size;

  if (!filtered.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6">No submissions found for this date range.</td>`;
    els.rows.append(row);
    return;
  }

  filtered.forEach((submission) => {
    const row = document.createElement("tr");
    const story = submission.story || "Video-only submission";
    row.innerHTML = `
      <td>
        <strong>${escapeHtml(submission.studentName)}</strong><br />
        <small>${formatDate(submission.createdAt)}</small>
        ${submission.driveStatus ? `<br /><small>${escapeHtml(submission.driveStatus)}</small>` : ""}
      </td>
      <td>${escapeHtml(submission.grade)}</td>
      <td>${escapeHtml(submission.school)}</td>
      <td>${escapeHtml(submission.teachers.join(", "))}</td>
      <td class="story-cell">${escapeHtml(story)}</td>
      <td>${renderVideoDownload(submission)}</td>
    `;
    els.rows.append(row);
  });
}

function renderVideoDownload(submission) {
  if (!submission.video) return `<span>No file</span>`;
  return `
    <button class="download-link" type="button" data-download-video="${submission.id}">
      Download File
    </button>
  `;
}

function renderAll() {
  if (els.leaderboardMini) renderLeaderboard(els.leaderboardMini, 5);
  if (els.leaderboardFull) renderLeaderboard(els.leaderboardFull);
  if (els.leaderboardRanking) renderLeaderboard(els.leaderboardRanking);
  if (els.rankingTotal) els.rankingTotal.textContent = submissions.length;
  if (els.rankingTeacherTotal) {
    els.rankingTeacherTotal.textContent = new Set(submissions.flatMap((item) => item.teachers)).size;
  }
  renderAdmin();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadUrl(url, filename) {
  const a = document.createElement("a");
  a.href = resolveDownloadUrl(url);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
}

function resolveDownloadUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SERVER_API_BASE}${url}`;
}

function buildExportRows() {
  return getFilteredSubmissions().map((submission) => ({
    id: submission.id,
    submittedAt: new Date(submission.createdAt).toISOString(),
    studentName: submission.studentName,
    grade: submission.grade,
    school: submission.school,
    teachers: submission.teachers.join("; "),
    story: submission.story,
    videoFileName: submission.video?.name || submission.video?.fileName || "",
    videoType: submission.video?.type || "",
    driveFolderId: DRIVE_FOLDER_ID,
    driveStatus: submission.driveStatus || "Local only",
    consent: submission.consent ? "Yes" : "No",
  }));
}

function getFilteredSubmissions() {
  const from = els.filterFrom.value ? startOfLocalDay(els.filterFrom.value) : null;
  const to = els.filterTo.value ? endOfLocalDay(els.filterTo.value) : null;

  return submissions.filter((submission) => {
    if (from && submission.createdAt < from) return false;
    if (to && submission.createdAt > to) return false;
    return true;
  });
}

function startOfLocalDay(dateValue) {
  return new Date(`${dateValue}T00:00:00`).getTime();
}

function endOfLocalDay(dateValue) {
  return new Date(`${dateValue}T23:59:59.999`).getTime();
}

function exportJson() {
  if (!requireAdminAccess()) return;
  const rows = buildExportRows();
  downloadBlob(
    new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
    `cs-tuition-story-submissions-${Date.now()}.json`,
  );
}

function exportCsv() {
  if (!requireAdminAccess()) return;
  const rows = buildExportRows();
  const headers = Object.keys(rows[0] || {
    id: "",
    submittedAt: "",
    studentName: "",
    grade: "",
    school: "",
    teachers: "",
    story: "",
    videoFileName: "",
    videoType: "",
    consent: "",
  });

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
  ].join("\n");

  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `cs-tuition-story-submissions-${Date.now()}.csv`,
  );
}

function videoFilename(submission) {
  const originalName = submission.video.name || submission.video.fileName || "video.mp4";
  const extension = originalName.includes(".")
    ? originalName.split(".").pop()
    : "mp4";
  const safeName = submission.studentName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safeName || "student"}-cs-tuition-thank-you-video.${extension}`;
}

async function uploadSubmissionToDrive(submission) {
  if (!DRIVE_UPLOAD_ENDPOINT) {
    return {
      ...submission,
      driveStatus: "Local only - Drive endpoint not connected",
    };
  }

  const payload = {
    folderId: DRIVE_FOLDER_ID,
    metadata: {
      id: submission.id,
      createdAt: new Date(submission.createdAt).toISOString(),
      studentName: submission.studentName,
      grade: submission.grade,
      school: submission.school,
      teachers: submission.teachers,
      story: submission.story,
      consent: submission.consent,
    },
    video: null,
  };

  if (submission.video?.blob) {
    payload.video = {
      name: submission.video.name,
      type: submission.video.type,
      base64: await blobToBase64(submission.video.blob),
    };
  }

  const response = await fetch(DRIVE_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Drive upload failed with status ${response.status}`);
  }

  return {
    ...submission,
    driveStatus: "Synced to Google Drive",
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function refresh() {
  submissions = await getAllSubmissions();
  renderAll();
}

function activateView(view) {
  const matchingTab = [...els.tabs].find((item) => item.dataset.view === view);

  els.tabs.forEach((item) => item.classList.toggle("active", item === matchingTab));
  els.views.forEach((item) => item.classList.toggle("active", item.id === view));
  window.location.hash = view;
  els.mainNav?.classList.remove("open");
  els.menuToggle?.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

els.viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateView(button.dataset.view);
  });
});

els.menuToggle?.addEventListener("click", () => {
  const isOpen = els.mainNav.classList.toggle("open");
  els.menuToggle.setAttribute("aria-expanded", String(isOpen));
});

function showFormStep(step) {
  currentFormStep = Math.max(0, Math.min(step, els.formSteps.length - 1));
  els.formSteps.forEach((item, index) => {
    item.classList.toggle("active", index === currentFormStep);
  });

  const progressIndex = currentFormStep <= 2
    ? 0
    : currentFormStep === 3
      ? 2
      : currentFormStep === 4
        ? 0
        : currentFormStep === 5
          ? 3
          : 4;

  els.formProgress?.querySelectorAll("li").forEach((item, index) => {
    item.classList.toggle("active", index === progressIndex);
  });

  if (els.mobileProgress) {
    els.mobileProgress.textContent = `Step ${Math.min(currentFormStep + 1, 5)} of 5`;
  }

  if (currentFormStep === els.formSteps.length - 1) {
    renderReview();
  }

  updateSubmitButton();
}

function getCurrentStepFields() {
  const currentStep = els.formSteps[currentFormStep];
  return currentStep ? [...currentStep.querySelectorAll("input, textarea, select")] : [];
}

function validateCurrentStep() {
  const fields = getCurrentStepFields().filter((field) => field.required);
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }

  if (currentFormStep === 3 && !getSelectedTeachers().length) {
    window.alert("Please choose at least one teacher.");
    return false;
  }

  return true;
}

function getSelectedTeachers() {
  return els.form ? new FormData(els.form).getAll("teachers").map(normalizeOption).filter(Boolean) : [];
}

function buildStoryText(data) {
  return [
    `Student phone: ${String(data.get("studentPhone") || "").trim()}`,
    `Student email: ${String(data.get("studentEmail") || "").trim()}`,
    `Subject: ${String(data.get("subject") || "").trim()}`,
    "",
    "Before meeting this teacher:",
    String(data.get("storyBefore") || "").trim(),
    "",
    "Impact moment:",
    String(data.get("impactMoment") || "").trim(),
    "",
    "What changed after that:",
    String(data.get("personalChange") || "").trim(),
    "",
    "Message to teacher:",
    String(data.get("teacherMessage") || "").trim(),
  ].join("\n");
}

function renderReview() {
  if (!els.reviewCard || !els.form) return;
  const data = new FormData(els.form);
  const teachers = getSelectedTeachers();
  const fileName = els.fileInput?.files[0]?.name || "No file uploaded";

  els.reviewCard.innerHTML = `
    <div class="review-meta">
      <span>Student: ${escapeHtml(data.get("studentName") || "-")}</span>
      <span>Teacher: ${escapeHtml(teachers.join(", ") || "-")}</span>
      <span>Year / Form: ${escapeHtml(data.get("grade") || "-")}</span>
      <span>Subject: ${escapeHtml(data.get("subject") || "-")}</span>
      <span>Email: ${escapeHtml(data.get("studentEmail") || "-")}</span>
      <span>Upload: ${escapeHtml(fileName)}</span>
    </div>
    <div>
      <h3>Student story preview</h3>
      <p>${escapeHtml(buildStoryText(data))}</p>
    </div>
  `;
}

function updateSubmitButton() {
  if (!els.submitStoryButton || !els.form) return;
  const consent = els.form.elements.consent;
  els.submitStoryButton.disabled = !consent?.checked;
}

els.formNextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!validateCurrentStep()) return;
    showFormStep(currentFormStep + 1);
  });
});

els.formBackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showFormStep(currentFormStep - 1);
  });
});

els.form?.addEventListener("input", () => {
  updateSubmitButton();
  if (currentFormStep === els.formSteps.length - 1) renderReview();
});

els.fileInput.addEventListener("change", () => {
  els.fileName.textContent = els.fileInput.files[0]?.name || "No file selected";
  updateSubmitButton();
});

els.clearForm?.addEventListener("click", () => {
  els.form.reset();
  els.fileName.textContent = "No file selected";
  els.formNote.textContent = "";
});

els.gradeOptionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addOption("grade", els.newGradeOption.value);
  els.newGradeOption.value = "";
});

els.teacherOptionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addOption("teacher", els.newTeacherOption.value);
  els.newTeacherOption.value = "";
});

els.gradeOptionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option-action]");
  if (!button) return;
  handleOptionAction(button);
});

els.teacherOptionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option-action]");
  if (!button) return;
  handleOptionAction(button);
});

function handleOptionAction(button) {
  const { optionAction, optionType, optionValue } = button.dataset;

  if (optionAction === "move-up") {
    moveOption(optionType, optionValue, -1);
    return;
  }

  if (optionAction === "move-down") {
    moveOption(optionType, optionValue, 1);
    return;
  }

  if (optionAction === "delete") {
    removeOption(optionType, optionValue);
  }
}

els.adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await loginAdmin(els.adminPassword.value);
    els.adminPassword.value = "";
    els.adminLoginNote.textContent = "";
    await refresh();
  } catch (error) {
    els.adminLoginNote.textContent = error.message;
  }
});

els.adminLogout.addEventListener("click", async () => {
  await logoutAdmin();
});

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(els.form);
  const story = buildStoryText(data);
  const videoFile = data.get("video");
  const teachers = getSelectedTeachers();

  if (!data.get("consent")) {
    els.formNote.textContent = "Please tick the consent checkbox before submitting.";
    return;
  }

  if (!teachers.length) {
    els.formNote.textContent = "Please choose at least one teacher to thank.";
    return;
  }

  const submission = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    studentName: String(data.get("studentName")).trim(),
    grade: String(data.get("grade")).trim(),
    school: String(data.get("school")).trim(),
    teachers,
    story,
    consent: data.get("consent") === "on",
    video: videoFile && videoFile.size ? {
      name: videoFile.name,
      type: videoFile.type || "application/octet-stream",
      size: videoFile.size,
      blob: videoFile,
    } : null,
  };

  let savedSubmission = submission;
  try {
    savedSubmission = await uploadSubmissionToDrive(submission);
    els.formNote.innerHTML = `<span class="success">Submitted and synced to Drive.</span>`;
  } catch (error) {
    savedSubmission = {
      ...submission,
      driveStatus: `Drive sync failed - ${error.message}`,
    };
    els.formNote.textContent = "Submitted locally, but Drive sync failed. Please check the endpoint.";
  }

  try {
    await saveSubmission(savedSubmission);
  } catch (error) {
    els.formNote.textContent = serverMode
      ? "Submission failed. Please try again or contact CS Tuition."
      : "Submission failed locally. Please try again.";
    return;
  }

  els.form.reset();
  els.fileName.textContent = "No file selected";
  showFormStep(0);
  if (serverMode) {
    els.formNote.innerHTML = `<span class="success">Submitted. The leaderboard is now updated for everyone.</span>`;
  } else if (!DRIVE_UPLOAD_ENDPOINT) {
    els.formNote.innerHTML = `<span class="success">Submitted locally. This browser-only mode will not update other devices.</span>`;
  }
  await refresh();
  activateView("thank-you");
});

els.rows.addEventListener("click", (event) => {
  if (!requireAdminAccess()) return;
  const button = event.target.closest("[data-download-video]");
  if (!button) return;

  const submission = submissions.find((item) => item.id === button.dataset.downloadVideo);
  if (!submission?.video) return;

  if (submission.video.downloadUrl) {
    downloadUrl(submission.video.downloadUrl, videoFilename(submission));
    return;
  }

  if (submission.video.blob) {
    downloadBlob(submission.video.blob, videoFilename(submission));
  }
});

els.exportCsv.addEventListener("click", exportCsv);
els.exportJson.addEventListener("click", exportJson);
els.downloadAllVideos.addEventListener("click", () => {
  if (!requireAdminAccess()) return;
  const videos = getFilteredSubmissions().filter((submission) => submission.video?.blob);
  if (!videos.length) {
    window.alert("No videos found for this date range.");
    return;
  }

  videos.forEach((submission, index) => {
    window.setTimeout(() => {
      if (submission.video.downloadUrl) {
        downloadUrl(submission.video.downloadUrl, videoFilename(submission));
        return;
      }

      downloadBlob(submission.video.blob, videoFilename(submission));
    }, index * 450);
  });
});
els.filterFrom.addEventListener("change", renderAdmin);
els.filterTo.addEventListener("change", renderAdmin);
els.clearFilters.addEventListener("click", () => {
  els.filterFrom.value = "";
  els.filterTo.value = "";
  renderAdmin();
});
els.clearAll.addEventListener("click", async () => {
  if (!requireAdminAccess()) return;
  const confirmed = window.confirm(
    serverMode
      ? "Clear all submissions from the shared CS Tuition server?"
      : "Clear all local submissions from this browser?",
  );
  if (!confirmed) return;
  await clearSubmissions();
  await refresh();
});

window.addEventListener("hashchange", () => {
  const view = window.location.hash.replace("#", "");
  if ([...els.views].some((item) => item.id === view)) {
    activateView(view);
  }
});

(async function init() {
  db = await openDb();
  await detectServerMode();
  await syncServerAdminStatus();
  await loadServerOptions();
  renderOptionControls();
  renderAdminAccess();
  els.driveSyncNote.textContent = DRIVE_UPLOAD_ENDPOINT
    ? "Auto-sync is connected. New submissions will be sent to Google Drive."
    : "Auto-sync is ready, but not connected yet. Add your Google Apps Script or backend endpoint in app.js.";
  await refresh();
  const initialView = window.location.hash.replace("#", "");
  if ([...els.views].some((item) => item.id === initialView)) {
    activateView(initialView);
  }
})();
