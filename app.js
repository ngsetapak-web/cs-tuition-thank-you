const DB_NAME = "cs-tuition-stories";
const DB_VERSION = 1;
const STORE_NAME = "submissions";
const DRIVE_FOLDER_ID = "1r20GuBnI0dxaC3n7ac3bCwkwTiCgaEnP";
const DRIVE_UPLOAD_ENDPOINT = "https://script.google.com/a/macros/cstuition.com.my/s/AKfycbzZmcB2I_ZdFNhAOBcp9U0JDCcUOaJOfFn6UJ8wDwPTqAG4DjxSDa7pvKxxo_0-t09NyA/exec";
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
  storyFilterTabs: document.querySelectorAll("[data-story-filter]"),
  gradeSelect: document.querySelector("#grade-select"),
  teacherOptions: document.querySelector("#teacher-options"),
  fileInput: document.querySelector("#video-file"),
  fileName: document.querySelector("#file-name"),
  achievementBeforeFile: document.querySelector("#achievement-before-file"),
  achievementAfterFile: document.querySelector("#achievement-after-file"),
  achievementBeforeName: document.querySelector("#achievement-before-name"),
  achievementAfterName: document.querySelector("#achievement-after-name"),
  formNote: document.querySelector("#form-note"),
  clearForm: document.querySelector("#clear-form"),
  teacherStoryGroups: document.querySelector("#teacher-story-groups"),
  rows: document.querySelector("#submission-rows"),
  adminLoginPanel: document.querySelector("#admin-login-panel"),
  adminContent: document.querySelector("#admin-content"),
  adminLoginForm: document.querySelector("#admin-login-form"),
  adminPassword: document.querySelector("#admin-password"),
  adminLoginNote: document.querySelector("#admin-login-note"),
  adminLogout: document.querySelector("#admin-logout"),
  adminReviewModal: document.querySelector("#admin-review-modal"),
  adminReviewBody: document.querySelector("#admin-review-body"),
  adminReviewActions: document.querySelector("#admin-review-actions"),
  adminReviewClose: document.querySelector("#admin-review-close"),
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
let currentStoryFilter = "all";

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
    attachments: [],
  };

  if (submission.video?.blob) {
    payload.video = {
      name: submission.video.name,
      type: submission.video.type,
      size: submission.video.size,
      base64: await blobToBase64(submission.video.blob),
    };
  }

  if (Array.isArray(submission.attachments)) {
    payload.attachments = await Promise.all(submission.attachments
      .filter((attachment) => attachment.file?.size)
      .map(async (attachment) => ({
        key: attachment.key,
        name: attachment.file.name,
        type: attachment.file.type || "application/octet-stream",
        size: attachment.file.size,
        base64: await blobToBase64(attachment.file),
      })));
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

function getTeacherAppreciationCounts() {
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

function renderTeacherAppreciationList(target, limit) {
  const appreciationList = getTeacherAppreciationCounts().slice(0, limit);
  target.innerHTML = "";

  if (!submissions.length) {
    target.append(els.emptyTemplate.content.cloneNode(true));
    return;
  }

  appreciationList.forEach((entry) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>
        <strong>${escapeHtml(entry.teacher)}</strong>
        <small>${entry.count === 1 ? "1 story shared" : `${entry.count} stories shared`}</small>
      </span>
      <span class="story-count">${entry.count}</span>
    `;
    target.append(li);
  });
}

function getTeacherStoryGroups() {
  return teacherOptions
    .map((teacher) => ({
      teacher,
      stories: submissions
        .filter((submission) => submission.teachers.includes(teacher))
        .filter(matchesCurrentStoryFilter),
    }))
    .filter((group) => group.stories.length);
}

function matchesCurrentStoryFilter(submission) {
  if (currentStoryFilter === "video") return Boolean(submission.video);
  if (currentStoryFilter === "text") return !submission.video;
  return true;
}

function renderTeacherStoryGroups() {
  if (!els.teacherStoryGroups) return;

  const groups = getTeacherStoryGroups();
  els.teacherStoryGroups.innerHTML = "";

  if (!groups.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state teacher-story-empty";
    empty.textContent = currentStoryFilter === "all"
      ? "No approved stories yet. Once admin approves a submission, it will appear here by teacher."
      : "No approved stories found for this filter yet.";
    els.teacherStoryGroups.append(empty);
    return;
  }

  groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "teacher-story-group";
    section.innerHTML = `
      <div class="teacher-story-heading">
        <h3>${escapeHtml(group.teacher)}</h3>
        <span>${group.stories.length === 1 ? "1 story" : `${group.stories.length} stories`}</span>
      </div>
      <div class="teacher-story-list">
        ${group.stories.map(renderPublicStoryCard).join("")}
      </div>
    `;
    els.teacherStoryGroups.append(section);
  });
}

function updateStoryFilterViews() {
  document.querySelectorAll(".story-carousel [data-story-type]").forEach((card) => {
    const isVisible = currentStoryFilter === "all" || card.dataset.storyType === currentStoryFilter;
    card.classList.toggle("is-hidden", !isVisible);
  });
  renderTeacherStoryGroups();
}

function renderPublicStoryCard(submission) {
  const story = buildPublicStoryPreview(submission.story) || "A video appreciation was shared for this teacher.";
  const student = submission.studentName || "Anonymous Student";
  const school = submission.school || "CS Tuition Student";
  const mediaLabel = submission.video ? "VIDEO" : "TEXT";

  return `
    <article class="public-story-card">
      ${renderPublicStoryMedia(submission)}
      <span class="story-tag">${mediaLabel}</span>
      <p>${escapeHtml(shortStoryPreview(story))}</p>
      <small>${escapeHtml(student)} · ${escapeHtml(school)}</small>
    </article>
  `;
}

function renderPublicStoryMedia(submission) {
  if (!submission.video?.downloadUrl) return "";
  const type = submission.video.type || "";
  if (type.startsWith("video/")) {
    return `
      <video class="public-story-media" controls preload="metadata">
        <source src="${escapeHtml(submission.video.downloadUrl)}" type="${escapeHtml(type)}" />
      </video>
    `;
  }
  if (type.startsWith("image/")) {
    return `<img class="public-story-media" src="${escapeHtml(submission.video.downloadUrl)}" alt="Student uploaded appreciation" />`;
  }
  return "";
}

function buildPublicStoryPreview(story) {
  const sections = parseStorySections(story);
  const before = cleanStoryPart(sections["Before meeting this teacher"]);
  const impact = cleanStoryPart(sections["Impact moment"]);
  const changed = cleanStoryPart(sections["What changed after that"]);
  const message = cleanStoryPart(sections["Message to teacher"]);
  const achievement = cleanStoryPart(sections["Achievement before and after"]);
  const parts = [before, impact, changed, message, achievement].filter(Boolean);

  if (parts.length) {
    const isChineseStory = hasChineseText(parts.join(""));
    const storyPreview = isChineseStory
      ? buildChineseStoryPreview({ before, impact, changed, message, achievement })
      : buildEnglishStoryPreview({ before, impact, changed, message, achievement });
    return shortStoryPreview(storyPreview);
  }

  return shortStoryPreview(story);
}

function buildChineseStoryPreview({ before, impact, changed, message, achievement }) {
  return [
    before ? `以前，${withChinesePeriod(before)}` : "",
    impact ? `${withChinesePeriod(impact)}` : "",
    changed ? `后来，${withChinesePeriod(changed)}` : "",
    message ? `${withChinesePeriod(message)}` : "",
    achievement ? `进步成果：${withChinesePeriod(achievement)}` : "",
  ].filter(Boolean).join("");
}

function buildEnglishStoryPreview({ before, impact, changed, message, achievement }) {
  return [
    before ? `Before meeting this teacher, ${withEnglishPeriod(before)}` : "",
    impact ? `The moment I remember most is ${lowercaseFirst(withEnglishPeriod(impact))}` : "",
    changed ? `After that, ${lowercaseFirst(withEnglishPeriod(changed))}` : "",
    message ? withEnglishPeriod(message) : "",
    achievement ? `Achievement: ${withEnglishPeriod(achievement)}` : "",
  ].filter(Boolean).join(" ");
}

function cleanStoryPart(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasChineseText(value) {
  return /[\u3400-\u9fff]/.test(value);
}

function withChinesePeriod(value) {
  const text = cleanStoryPart(value);
  return /[。！？!?]$/.test(text) ? text : `${text}。`;
}

function withEnglishPeriod(value) {
  const text = cleanStoryPart(value);
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function lowercaseFirst(value) {
  return value.replace(/^([A-Z])/, (letter) => letter.toLowerCase());
}

function shortStoryPreview(story) {
  const text = String(story || "");
  const cleaned = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(Student phone|Subject|Before meeting this teacher|Impact moment|What changed after that|Message to teacher|Achievement before and after):/i.test(line))
    .join(" ");
  return cleaned.length > 220 ? `${cleaned.slice(0, 220).trim()}...` : cleaned;
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
    row.innerHTML = `<td colspan="8">No submissions found for this date range.</td>`;
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
      <td>${escapeHtml(submission.driveStatus || "Pending review")}</td>
      <td>${renderSubmissionActions(submission)}</td>
    `;
    els.rows.append(row);
  });
}

function renderVideoDownload(submission) {
  if (!submission.video) return `<span>No file</span>`;
  const files = normalizeSubmissionFiles(submission);
  if (!files.length) return `<span>No file</span>`;
  return files.map((file) => `
    <button class="download-link" type="button" data-download-video="${submission.id}" data-download-file="${escapeHtml(file.key)}">
      Download ${escapeHtml(file.label)}
    </button>
  `).join("");
}

function normalizeSubmissionFiles(submission) {
  if (!submission.video) return [];
  const labelMap = {
    primary: "Story File",
    achievementBefore: "Before Result",
    achievementAfter: "After Result",
  };
  if (submission.video.downloadUrl || submission.video.blob || submission.video.fileName) {
    return [{ key: "primary", label: "Story File", file: submission.video }];
  }
  return Object.entries(submission.video)
    .filter(([, file]) => file)
    .map(([key, file]) => ({
      key,
      label: labelMap[key] || "File",
      file,
    }));
}

function renderSubmissionActions(submission) {
  const isApproved = submission.driveStatus === "Approved";
  return `
    <button class="download-link" type="button" data-review-submission="${submission.id}">Review</button>
    ${isApproved ? "" : `<button class="download-link" type="button" data-approve-submission="${submission.id}">Approve</button>`}
    <button class="danger-button compact-danger" type="button" data-delete-submission="${submission.id}">Delete</button>
  `;
}

function parseStorySections(story) {
  const labels = [
    "Student phone",
    "Subject",
    "Before meeting this teacher",
    "Impact moment",
    "What changed after that",
    "Message to teacher",
    "Achievement before and after",
  ];
  const sections = {};
  let currentLabel = "";

  String(story || "").split("\n").forEach((line) => {
    const trimmed = line.trim();
    const matchedLabel = labels.find((label) => trimmed.toLowerCase() === `${label}:`.toLowerCase());
    if (matchedLabel) {
      currentLabel = matchedLabel;
      sections[currentLabel] = "";
      return;
    }

    const inlineLabel = labels.find((label) => trimmed.toLowerCase().startsWith(`${label}:`.toLowerCase()));
    if (inlineLabel) {
      currentLabel = inlineLabel;
      sections[currentLabel] = trimmed.slice(inlineLabel.length + 1).trim();
      return;
    }

    if (currentLabel && trimmed) {
      sections[currentLabel] = `${sections[currentLabel] ? `${sections[currentLabel]}\n` : ""}${trimmed}`;
    }
  });

  return sections;
}

function openAdminReview(id) {
  const submission = submissions.find((item) => item.id === id);
  if (!submission || !els.adminReviewModal) return;

  const sections = parseStorySections(submission.story);
  const isApproved = submission.driveStatus === "Approved";
  els.adminReviewBody.innerHTML = `
    <div class="admin-review-meta">
      <span><strong>Student</strong>${escapeHtml(submission.studentName || "-")}</span>
      <span><strong>School</strong>${escapeHtml(submission.school || "-")}</span>
      <span><strong>Year / Form</strong>${escapeHtml(submission.grade || "-")}</span>
      <span><strong>Teacher(s)</strong>${escapeHtml(submission.teachers?.join(", ") || "-")}</span>
      <span><strong>Status</strong>${escapeHtml(submission.driveStatus || "Pending review")}</span>
      <span><strong>Submitted</strong>${escapeHtml(formatDate(submission.createdAt))}</span>
    </div>
    <div class="admin-review-story">
      ${renderReviewSection("Student phone", sections["Student phone"])}
      ${renderReviewSection("Subject", sections.Subject)}
      ${renderReviewSection("Before meeting this teacher", sections["Before meeting this teacher"])}
      ${renderReviewSection("Impact moment", sections["Impact moment"])}
      ${renderReviewSection("What changed after that", sections["What changed after that"])}
      ${renderReviewSection("Message to teacher", sections["Message to teacher"])}
      ${renderReviewSection("Achievement before and after", sections["Achievement before and after"])}
    </div>
    <div class="admin-review-files">
      <h3>Uploaded files</h3>
      ${renderReviewFiles(submission)}
    </div>
  `;
  els.adminReviewActions.innerHTML = `
    ${isApproved ? "" : `<button class="primary-button" type="button" data-modal-approve="${submission.id}">Approve story</button>`}
    <button class="danger-button" type="button" data-modal-delete="${submission.id}">Delete story</button>
  `;
  els.adminReviewModal.showModal();
}

function renderReviewSection(label, value) {
  if (!value) return "";
  return `
    <section>
      <h3>${escapeHtml(label)}</h3>
      <p>${escapeHtml(value)}</p>
    </section>
  `;
}

function renderReviewFiles(submission) {
  const files = normalizeSubmissionFiles(submission);
  if (!files.length) return `<p>No uploaded files.</p>`;
  return files.map((item) => `
    <button class="download-link" type="button" data-download-video="${submission.id}" data-download-file="${escapeHtml(item.key)}">
      Download ${escapeHtml(item.label)}
    </button>
  `).join("");
}

function renderAll() {
  renderTeacherStoryGroups();
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
    files: normalizeSubmissionFiles(submission).map((item) => item.file.name || item.file.fileName || item.key).join("; "),
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
    files: "",
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

function videoFilename(submission, file = submission.video) {
  const originalName = file.name || file.fileName || "upload";
  const extension = originalName.includes(".")
    ? originalName.split(".").pop()
    : "file";
  const safeName = submission.studentName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const safeKey = (file.key || "story").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safeName || "student"}-${safeKey || "story"}.${extension}`;
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
      studentPhone: submission.studentPhone,
      grade: submission.grade,
      school: submission.school,
      teachers: submission.teachers,
      subject: submission.subject,
      story: submission.story,
      consent: submission.consent,
    },
    video: null,
    attachments: [],
  };

  if (submission.video?.blob) {
    payload.video = {
      name: submission.video.name,
      type: submission.video.type,
      base64: await blobToBase64(submission.video.blob),
    };
  }

  if (Array.isArray(submission.attachments)) {
    payload.attachments = await Promise.all(submission.attachments
      .filter((attachment) => attachment.file?.size)
      .map(async (attachment) => ({
        key: attachment.key,
        name: attachment.file.name,
        type: attachment.file.type,
        base64: await blobToBase64(attachment.file),
      })));
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

  const progressIndex = currentFormStep === 0
    ? 0
    : currentFormStep <= 3
      ? 1
      : currentFormStep === 4
      ? 2
      : currentFormStep === 5
        ? 3
        : currentFormStep === 6
          ? 4
          : 5;

  els.formProgress?.querySelectorAll("li").forEach((item, index) => {
    item.classList.toggle("active", index === progressIndex);
  });

  if (els.mobileProgress) {
    els.mobileProgress.textContent = `Step ${Math.min(currentFormStep + 1, 6)} of 6`;
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

  const currentStep = els.formSteps[currentFormStep];
  if (currentStep?.querySelector("#teacher-options") && !getSelectedTeachers().length) {
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
    "",
    "Achievement before and after:",
    String(data.get("achievementText") || "").trim(),
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
      <span>Upload: ${escapeHtml(fileName)}</span>
      <span>Achievement before: ${escapeHtml(els.achievementBeforeFile?.files[0]?.name || "No photo")}</span>
      <span>Achievement after: ${escapeHtml(els.achievementAfterFile?.files[0]?.name || "No photo")}</span>
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

els.storyFilterTabs.forEach((button) => {
  button.addEventListener("click", () => {
    currentStoryFilter = button.dataset.storyFilter;
    els.storyFilterTabs.forEach((item) => item.classList.toggle("active", item === button));
    updateStoryFilterViews();
  });
});

els.fileInput.addEventListener("change", () => {
  els.fileName.textContent = els.fileInput.files[0]?.name || "No file selected";
  updateSubmitButton();
});

els.achievementBeforeFile?.addEventListener("change", () => {
  els.achievementBeforeName.textContent = els.achievementBeforeFile.files[0]?.name || "No before photo selected";
});

els.achievementAfterFile?.addEventListener("change", () => {
  els.achievementAfterName.textContent = els.achievementAfterFile.files[0]?.name || "No after photo selected";
});

els.clearForm?.addEventListener("click", () => {
  els.form.reset();
  els.fileName.textContent = "No file selected";
  if (els.achievementBeforeName) els.achievementBeforeName.textContent = "No before photo selected";
  if (els.achievementAfterName) els.achievementAfterName.textContent = "No after photo selected";
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
    studentPhone: String(data.get("studentPhone")).trim(),
    grade: String(data.get("grade")).trim(),
    school: String(data.get("school")).trim(),
    teachers,
    subject: String(data.get("subject")).trim(),
    story,
    consent: data.get("consent") === "on",
    driveStatus: "Pending review",
    video: videoFile && videoFile.size ? {
      name: videoFile.name,
      type: videoFile.type || "application/octet-stream",
      size: videoFile.size,
      blob: videoFile,
    } : null,
    attachments: [
      { key: "achievementBefore", file: data.get("achievementBeforeFile") },
      { key: "achievementAfter", file: data.get("achievementAfterFile") },
    ],
  };

  let savedSubmission = submission;
  try {
    savedSubmission = {
      ...(await uploadSubmissionToDrive(submission)),
      driveStatus: "Pending review",
    };
    els.formNote.innerHTML = `<span class="success">Submitted and synced to Drive.</span>`;
  } catch (error) {
    savedSubmission = {
      ...submission,
      driveStatus: "Pending review",
    };
    els.formNote.textContent = "Submitted for review, but Drive sync failed. Please check the endpoint.";
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
  if (els.achievementBeforeName) els.achievementBeforeName.textContent = "No before photo selected";
  if (els.achievementAfterName) els.achievementAfterName.textContent = "No after photo selected";
  showFormStep(0);
  if (serverMode) {
    els.formNote.innerHTML = `<span class="success">Submitted for admin review. Your story will appear after approval.</span>`;
  } else if (!DRIVE_UPLOAD_ENDPOINT) {
    els.formNote.innerHTML = `<span class="success">Submitted locally. This browser-only mode will not update other devices.</span>`;
  }
  await refresh();
  activateView("thank-you");
});

els.rows.addEventListener("click", (event) => {
  if (!requireAdminAccess()) return;
  const reviewButton = event.target.closest("[data-review-submission]");
  if (reviewButton) {
    openAdminReview(reviewButton.dataset.reviewSubmission);
    return;
  }

  const approveButton = event.target.closest("[data-approve-submission]");
  if (approveButton) {
    approveSubmission(approveButton.dataset.approveSubmission);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-submission]");
  if (deleteButton) {
    deleteSubmission(deleteButton.dataset.deleteSubmission);
    return;
  }

  const button = event.target.closest("[data-download-video]");
  if (!button) return;

  const submission = submissions.find((item) => item.id === button.dataset.downloadVideo);
  if (!submission?.video) return;
  const file = normalizeSubmissionFiles(submission).find((item) => item.key === button.dataset.downloadFile)?.file;
  if (!file) return;

  if (file.downloadUrl) {
    downloadUrl(file.downloadUrl, videoFilename(submission, file));
    return;
  }

  if (file.blob) {
    downloadBlob(file.blob, videoFilename(submission, file));
  }
});

els.adminReviewClose?.addEventListener("click", () => {
  els.adminReviewModal.close();
});

els.adminReviewActions?.addEventListener("click", (event) => {
  const approveButton = event.target.closest("[data-modal-approve]");
  if (approveButton) {
    els.adminReviewModal.close();
    approveSubmission(approveButton.dataset.modalApprove);
    return;
  }

  const deleteButton = event.target.closest("[data-modal-delete]");
  if (deleteButton) {
    els.adminReviewModal.close();
    deleteSubmission(deleteButton.dataset.modalDelete);
  }
});

els.adminReviewBody?.addEventListener("click", (event) => {
  if (!requireAdminAccess()) return;
  const button = event.target.closest("[data-download-video]");
  if (!button) return;

  const submission = submissions.find((item) => item.id === button.dataset.downloadVideo);
  const file = submission ? normalizeSubmissionFiles(submission).find((item) => item.key === button.dataset.downloadFile)?.file : null;
  if (!submission || !file) return;

  if (file.downloadUrl) {
    downloadUrl(file.downloadUrl, videoFilename(submission, file));
    return;
  }

  if (file.blob) {
    downloadBlob(file.blob, videoFilename(submission, file));
  }
});

async function approveSubmission(id) {
  if (!serverMode) {
    const submission = submissions.find((item) => item.id === id);
    if (!submission) return;
    submission.driveStatus = "Approved";
    await saveSubmission(submission);
    await refresh();
    return;
  }

  await fetch(`${SERVER_API_BASE}/api/submissions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ status: "Approved" }),
  });
  await refresh();
}

async function deleteSubmission(id) {
  const confirmed = window.prompt("Type confirm delete to delete this story.");
  if (confirmed !== "confirm delete") return;

  if (!serverMode) {
    await new Promise((resolve, reject) => {
      const request = dbTransaction("readwrite").delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await refresh();
    return;
  }

  await fetch(`${SERVER_API_BASE}/api/submissions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  await refresh();
}

els.exportCsv.addEventListener("click", exportCsv);
els.exportJson.addEventListener("click", exportJson);
els.downloadAllVideos.addEventListener("click", () => {
  if (!requireAdminAccess()) return;
  const videos = getFilteredSubmissions().flatMap((submission) => normalizeSubmissionFiles(submission).map((file) => ({ submission, ...file })));
  if (!videos.length) {
    window.alert("No files found for this date range.");
    return;
  }

  videos.forEach((item, index) => {
    window.setTimeout(() => {
      if (item.file.downloadUrl) {
        downloadUrl(item.file.downloadUrl, videoFilename(item.submission, item.file));
        return;
      }

      if (item.file.blob) {
        downloadBlob(item.file.blob, videoFilename(item.submission, item.file));
      }
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
