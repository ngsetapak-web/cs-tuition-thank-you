const CS_TUITION_SHEET_ID = "1pyXIn_rngpLb8T3DDHUk_IuvGaSjl2qy1B09HOf5mNI";
const CS_TUITION_DRIVE_FOLDER_ID = "1r20GuBnI0dxaC3n7ac3bCwkwTiCgaEnP";
const CS_TUITION_SHEET_NAME = "Submissions";

const SHEET_HEADERS = [
  "Submitted At",
  "Submission ID",
  "Student Name",
  "Student Phone",
  "Year / Form",
  "School",
  "Teacher(s)",
  "Subject",
  "Before Meeting Teacher",
  "Impact Moment",
  "What Changed After That",
  "Message To Teacher",
  "Achievement Before And After",
  "Consent",
  "Story File Link",
  "Achievement Before File Link",
  "Achievement After File Link",
  "Raw Story",
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const payload = JSON.parse(e.postData.contents);
    const metadata = payload.metadata || {};
    const folder = DriveApp.getFolderById(payload.folderId || CS_TUITION_DRIVE_FOLDER_ID);
    const submittedAt = metadata.createdAt || new Date().toISOString();
    const submittedDate = submittedAt.slice(0, 10);
    const studentSlug = slugify(metadata.studentName);
    const baseName = `${submittedDate}_${studentSlug}_${metadata.id || Date.now()}`;
    const storySections = parseStorySections(metadata.story);
    const fileLinks = {};

    if (payload.video && payload.video.base64) {
      fileLinks.primary = createDriveFile(folder, payload.video, `${baseName}_story`);
    }

    if (Array.isArray(payload.attachments)) {
      payload.attachments.forEach((attachment) => {
        if (!attachment || !attachment.base64) return;
        fileLinks[attachment.key] = createDriveFile(folder, attachment, `${baseName}_${attachment.key}`);
      });
    }

    appendSubmissionRow(metadata, storySections, fileLinks);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, folderId: folder.getId(), fileLinks }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function appendSubmissionRow(metadata, storySections, fileLinks) {
  const sheet = getSubmissionSheet();
  sheet.appendRow([
    metadata.createdAt || new Date().toISOString(),
    metadata.id || "",
    metadata.studentName || "",
    metadata.studentPhone || storySections["Student phone"] || "",
    metadata.grade || "",
    metadata.school || "",
    Array.isArray(metadata.teachers) ? metadata.teachers.join(", ") : "",
    metadata.subject || storySections.Subject || "",
    storySections["Before meeting this teacher"] || "",
    storySections["Impact moment"] || "",
    storySections["What changed after that"] || "",
    storySections["Message to teacher"] || "",
    storySections["Achievement before and after"] || "",
    metadata.consent ? "Yes" : "No",
    fileLinks.primary || "",
    fileLinks.achievementBefore || "",
    fileLinks.achievementAfter || "",
    metadata.story || "",
  ]);
}

function getSubmissionSheet() {
  const spreadsheet = SpreadsheetApp.openById(CS_TUITION_SHEET_ID);
  const sheet = spreadsheet.getSheetByName(CS_TUITION_SHEET_NAME)
    || spreadsheet.insertSheet(CS_TUITION_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function createDriveFile(folder, filePayload, filePrefix) {
  const bytes = Utilities.base64Decode(filePayload.base64);
  const originalName = filePayload.name || "upload";
  const extension = originalName.includes(".") ? originalName.split(".").pop() : "";
  const safeFileName = `${filePrefix}${extension ? `.${extension}` : ""}`;
  const blob = Utilities.newBlob(
    bytes,
    filePayload.type || "application/octet-stream",
    safeFileName
  );
  const file = folder.createFile(blob);
  return file.getUrl();
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

function slugify(value) {
  return String(value || "student")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
