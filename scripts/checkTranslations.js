const fs = require("fs");
const path = require("path");

// Directories & files
const SRC_DIR = path.join(__dirname, "..", "src");
const LOCALE_DIR = path.join(__dirname, "..", "src", "localization");
const LANG_FILES = ["en.json", "ro.json"].map((f) => path.join(LOCALE_DIR, f));

// Recursively walk through directory to collect files
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else if (entry.isFile() && /(jsx?|tsx?)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// Extract translation keys from file content
function extractKeys(content) {
  const keys = new Set();
  const translateRegex = /translate\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const pluralRegex = /translatePlural\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*["'`]([^"'`]+)["'`]/g;

  let match;
  while ((match = translateRegex.exec(content))) {
    keys.add(match[1]);
  }
  while ((match = pluralRegex.exec(content))) {
    keys.add(match[1]);
    keys.add(match[2]);
  }
  return keys;
}

// Collect all keys used in codebase
const usedKeys = new Set();
walk(SRC_DIR).forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  extractKeys(content).forEach((k) => usedKeys.add(k));
});

// Load language files
const missingByLang = {};
LANG_FILES.forEach((filePath) => {
  const langCode = path.basename(filePath, ".json");
  const translations = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const missing = [];
  usedKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(translations, key)) {
      missing.push(key);
    }
  });
  if (missing.length) {
    missingByLang[langCode] = missing;
  }
});

if (Object.keys(missingByLang).length) {
  console.error("\u001b[31mMissing translation keys detected:\u001b[0m");
  for (const [lang, keys] of Object.entries(missingByLang)) {
    console.error(`\nLanguage: ${lang}`);
    keys.forEach((k) => console.error(`  - ${k}`));
  }
  console.error("\n\u001b[31mPlease add the missing keys before committing.\u001b[0m");
  process.exit(1);
} else {
  console.log("\u001b[32mAll translation keys are present.\u001b[0m");
}