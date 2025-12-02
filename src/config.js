/**
 * Configuration Management
 * Loads settings from environment variables with sensible defaults
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

export const CONFIG = {
  // Git Configuration
  git: {
    userName: process.env.GIT_USER_NAME || "GitHub Contributor",
    userEmail: process.env.GIT_USER_EMAIL || "contributor@example.com",
    remoteName: process.env.GIT_REMOTE_NAME || "origin",
    branch: process.env.GIT_BRANCH || "main",
    repoUrl: process.env.GIT_REPO_URL || "",
  },

  // Commit Configuration
  commits: {
    minPerDay: parseInt(process.env.MIN_COMMITS_PER_DAY) || 1,
    maxPerDay: parseInt(process.env.MAX_COMMITS_PER_DAY) || 5,
    dataFile: process.env.DATA_FILE || join(ROOT_DIR, "data.json"),
  },

  // Schedule Configuration
  schedule: {
    enabled: process.env.SCHEDULE_ENABLED === "true",
    cron: process.env.SCHEDULE_CRON || "0 9 * * *", // Default: 9 AM daily
    timezone: process.env.SCHEDULE_TIMEZONE || "UTC",
  },

  // Backfill Configuration (for filling past dates)
  backfill: {
    enabled: process.env.BACKFILL_ENABLED === "true",
    startDate: process.env.BACKFILL_START_DATE || "",
    endDate: process.env.BACKFILL_END_DATE || "",
    skipWeekends: process.env.BACKFILL_SKIP_WEEKENDS === "true",
    minCommits: parseInt(process.env.BACKFILL_MIN_COMMITS) || 1,
    maxCommits: parseInt(process.env.BACKFILL_MAX_COMMITS) || 8,
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || join(ROOT_DIR, "logs", "app.log"),
    maxSize: process.env.LOG_MAX_SIZE || "10m",
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
  },

  // Application Settings
  app: {
    env: process.env.NODE_ENV || "development",
    dryRun: process.env.DRY_RUN === "true",
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 1000,
  },

  // Health Check
  health: {
    port: parseInt(process.env.HEALTH_PORT) || 3000,
    enabled: process.env.HEALTH_ENABLED === "true",
  },
};

/**
 * Validate required configuration
 */
export const validateConfig = () => {
  const errors = [];

  if (!CONFIG.git.userEmail || CONFIG.git.userEmail === "contributor@example.com") {
    errors.push("GIT_USER_EMAIL is required");
  }

  if (!CONFIG.git.repoUrl && CONFIG.app.env === "production") {
    errors.push("GIT_REPO_URL is required in production");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export default CONFIG;
