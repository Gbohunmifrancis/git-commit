/**
 * GitHub Contributions Generator
 * Main entry point for the application
 */

import { CONFIG, validateConfig } from "./config.js";
import logger from "./logger.js";
import gitService from "./git-service.js";
import commitService from "./commit-service.js";
import scheduler from "./scheduler.js";
import healthServer from "./health-server.js";

/**
 * Display banner
 */
const showBanner = () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║        GitHub Contributions Generator v1.0.0              ║
║        Automated Daily Contribution System                ║
╚═══════════════════════════════════════════════════════════╝
  `);
};

/**
 * Run once mode - create contributions and exit
 */
const runOnce = async () => {
  logger.info("Running in single execution mode");

  try {
    // Initialize git
    await gitService.initialize();

    // Pull latest changes
    await gitService.pull();

    // Create today's contributions
    const results = await commitService.createTodayContributions();

    // Push changes
    await gitService.push();

    logger.info("Single execution completed successfully", {
      commitsCreated: results.length,
    });

    return true;
  } catch (error) {
    logger.error("Single execution failed", { error: error.message });
    throw error;
  }
};

/**
 * Run backfill mode - fill in past contributions
 */
const runBackfill = async () => {
  const { startDate, endDate } = CONFIG.backfill;

  if (!startDate || !endDate) {
    throw new Error("BACKFILL_START_DATE and BACKFILL_END_DATE are required");
  }

  logger.info("Running in backfill mode", { startDate, endDate });

  try {
    // Initialize git
    await gitService.initialize();

    // Run backfill
    const stats = await commitService.backfillContributions(startDate, endDate);

    // Push changes
    await gitService.push();

    logger.info("Backfill completed successfully", stats);

    return stats;
  } catch (error) {
    logger.error("Backfill failed", { error: error.message });
    throw error;
  }
};

/**
 * Run scheduled mode - start scheduler and health server
 */
const runScheduled = async () => {
  logger.info("Running in scheduled mode");

  try {
    // Initialize git
    await gitService.initialize();

    // Start health server if enabled
    if (CONFIG.health.enabled) {
      healthServer.start();
    }

    // Start scheduler
    scheduler.start();

    // Handle shutdown signals
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      scheduler.stop();
      healthServer.stop();
      
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    logger.info("Application started in scheduled mode");
    logger.info(`Schedule: ${CONFIG.schedule.cron} (${CONFIG.schedule.timezone})`);

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    logger.error("Failed to start scheduled mode", { error: error.message });
    throw error;
  }
};

/**
 * Main application entry point
 */
const main = async () => {
  showBanner();

  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid && CONFIG.app.env === "production") {
    logger.error("Configuration validation failed", { errors: validation.errors });
    process.exit(1);
  }

  if (!validation.valid) {
    logger.warn("Configuration warnings", { errors: validation.errors });
  }

  // Log configuration (redacted)
  logger.info("Starting application", {
    env: CONFIG.app.env,
    dryRun: CONFIG.app.dryRun,
    scheduleEnabled: CONFIG.schedule.enabled,
    backfillEnabled: CONFIG.backfill.enabled,
  });

  try {
    // Determine run mode
    if (CONFIG.backfill.enabled) {
      await runBackfill();
      process.exit(0);
    } else if (CONFIG.schedule.enabled) {
      await runScheduled();
    } else {
      await runOnce();
      process.exit(0);
    }
  } catch (error) {
    logger.error("Application error", { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Run the application
main();
