/**
 * Logging Service
 * Provides structured logging with file and console output
 */

import winston from "winston";
import { CONFIG } from "./config.js";
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";

// Ensure log directory exists
const logDir = dirname(CONFIG.logging.file);
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: CONFIG.logging.level,
  defaultMeta: { service: "github-contributions" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: CONFIG.logging.file,
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: CONFIG.logging.maxFiles,
    }),
    // Separate file for errors
    new winston.transports.File({
      filename: CONFIG.logging.file.replace(".log", ".error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: CONFIG.logging.maxFiles,
    }),
  ],
});

// Add request context tracking
export const createChildLogger = (context) => {
  return logger.child(context);
};

export default logger;
