const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

function getProfilesFilePath(userDataPath) {
  return path.join(userDataPath, "converter-profiles.json");
}

async function readProfiles(userDataPath) {
  const filePath = getProfilesFilePath(userDataPath);
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeProfiles(userDataPath, profiles) {
  const filePath = getProfilesFilePath(userDataPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(profiles, null, 2)}\n`, "utf8");
}

async function saveProfile(userDataPath, { name, conversionType, options }) {
  const profiles = await readProfiles(userDataPath);
  const now = new Date().toISOString();
  const profile = {
    id: crypto.randomUUID(),
    name,
    conversionType,
    options,
    createdAt: now,
    lastUsedAt: now,
  };
  profiles.push(profile);
  await writeProfiles(userDataPath, profiles);
  return profile;
}

async function deleteProfile(userDataPath, profileId) {
  const profiles = await readProfiles(userDataPath);
  const next = profiles.filter((profile) => profile.id !== profileId);
  await writeProfiles(userDataPath, next);
  return next;
}

async function touchProfile(userDataPath, profileId) {
  const profiles = await readProfiles(userDataPath);
  const next = profiles.map((profile) =>
    profile.id === profileId ? { ...profile, lastUsedAt: new Date().toISOString() } : profile,
  );
  await writeProfiles(userDataPath, next);
  return next;
}

module.exports = { readProfiles, saveProfile, deleteProfile, touchProfile };
