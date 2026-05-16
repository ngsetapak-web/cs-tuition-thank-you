const CS_TUITION_DRIVE_FOLDER_ID = "1r20GuBnI0dxaC3n7ac3bCwkwTiCgaEnP";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const folder = DriveApp.getFolderById(payload.folderId || CS_TUITION_DRIVE_FOLDER_ID);
  const metadata = payload.metadata;
  const submittedAt = metadata.createdAt.slice(0, 10);
  const studentSlug = slugify(metadata.studentName);
  const baseName = `${submittedAt}_${studentSlug}_${metadata.id}`;

  folder.createFile(
    `${baseName}_story.json`,
    JSON.stringify(metadata, null, 2),
    MimeType.PLAIN_TEXT
  );

  if (payload.video && payload.video.base64) {
    const bytes = Utilities.base64Decode(payload.video.base64);
    const videoBlob = Utilities.newBlob(
      bytes,
      payload.video.type || "application/octet-stream",
      `${baseName}_${payload.video.name}`
    );
    folder.createFile(videoBlob);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, folderId: folder.getId() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function slugify(value) {
  return String(value || "student")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
