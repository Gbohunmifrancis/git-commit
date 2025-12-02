/**
 * Scheduler Service
 * Handles cron-based scheduling for automated commits
 */

import cron from "node-cron";
import { CONFIG } from "./config.js";
import logger from "./logger.js";
import commitService from "./commit-service.js";
import gitService from "./git-service.js";

class Scheduler {
  constructor() {
    this.job = null;
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
    };
  }

  /**
   * Execute the scheduled task
   */
  async executeTask() {
    if (this.isRunning) {
      logger.warn("Task already running, skipping this execution");
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.stats.totalRuns++;

    logger.info("Starting scheduled contribution task");

    try {
      // Pull latest changes first
      await gitService.pull();

      // Create today's contributions
      const results = await commitService.createTodayContributions();

      // Push to remote
      await gitService.push();

      this.stats.successfulRuns++;
      logger.info("Scheduled task completed successfully", {
        commitsCreated: results.length,
        stats: this.stats,
      });
    } catch (error) {
      this.stats.failedRuns++;
      logger.error("Scheduled task failed", {
        error: error.message,
        stats: this.stats,
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.job) {
      logger.warn("Scheduler already running");
      return;
    }

    const cronExpression = CONFIG.schedule.cron;
    const timezone = CONFIG.schedule.timezone;

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    logger.info("Starting scheduler", {
      cron: cronExpression,
      timezone,
    });

    this.job = cron.schedule(
      cronExpression,
      async () => {
        await this.executeTask();
      },
      {
        scheduled: true,
        timezone,
      }
    );

    this.job.start();
    logger.info("Scheduler started successfully");

    // Calculate next run
    this.updateNextRun();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info("Scheduler stopped");
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: !!this.job,
      isExecuting: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      stats: this.stats,
      config: {
        cron: CONFIG.schedule.cron,
        timezone: CONFIG.schedule.timezone,
      },
    };
  }

  /**
   * Update next run time (simplified)
   */
  updateNextRun() {
    // This is a simplified version - in production you might want
    // to use a library like cron-parser for accurate next run calculation
    this.nextRun = "See cron expression: " + CONFIG.schedule.cron;
  }

  /**
   * Run task immediately (manual trigger)
   */
  async runNow() {
    logger.info("Manual task execution triggered");
    await this.executeTask();
  }
}

// Export singleton instance
export default new Scheduler();
