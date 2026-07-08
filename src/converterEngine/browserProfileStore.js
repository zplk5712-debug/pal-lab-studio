const STORAGE_KEY = "motor-simulator-react:converter-profiles:v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export async function listProfiles() {
  return readAll();
}

export async function saveProfile({ name, conversionType, options }) {
  const profiles = readAll();
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
  writeAll(profiles);
  return profile;
}

export async function deleteProfile(profileId) {
  const next = readAll().filter((profile) => profile.id !== profileId);
  writeAll(next);
  return next;
}
