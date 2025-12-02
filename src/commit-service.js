/**
 * Commit Service
 * Handles the creation of contribution commits
 */

import jsonfile from "jsonfile";
import moment from "moment-timezone";
import crypto from "crypto";
import { CONFIG } from "./config.js";
import logger from "./logger.js";
import gitService from "./git-service.js";

class CommitService {
  constructor() {
    this.dataFile = CONFIG.commits.dataFile;
  }

  /**
   * Generate a unique commit message
   */
  generateCommitMessage(date) {
    const hash = crypto.randomBytes(4).toString("hex");
    const timestamp = moment(date).format("YYYY-MM-DD HH:mm:ss");
    return `chore: contribution ${timestamp} [${hash}]`;
  }

  /**
   * Generate random number of commits for the day
   */
  getRandomCommitCount() {
    const min = CONFIG.commits.minPerDay;
    const max = CONFIG.commits.maxPerDay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Write data to the tracking file
   */
  async writeDataFile(data) {
    return new Promise((resolve, reject) => {
      jsonfile.writeFile(this.dataFile, data, { spaces: 2 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Create a single commit with the specified date
   */
  async createCommit(date, message = null) {
    const commitDate = moment(date).format();
    const commitMessage = message || this.generateCommitMessage(date);

    const data = {
      date: commitDate,
      message: commitMessage,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    };

    try {
      // Write data file
      await this.writeDataFile(data);

      // Stage and commit
      await gitService.add([this.dataFile]);
      const result = await gitService.commit(commitMessage, { date: commitDate });

      logger.info("Commit created", {
        date: commitDate,
        message: commitMessage,
        commit: result.commit,
      });

      return result;
    } catch (error) {
      logger.error("Failed to create commit", {
        date: commitDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create today's contribution commits
   */
  async createTodayContributions() {
    const today = moment().tz(CONFIG.schedule.timezone);
    const commitCount = this.getRandomCommitCount();

    logger.info(`Creating ${commitCount} contributions for today`, {
      date: today.format("YYYY-MM-DD"),
      timezone: CONFIG.schedule.timezone,
    });

    const results = [];

    for (let i = 0; i < commitCount; i++) {
      // Add random minutes to spread commits throughout the day
      const commitTime = today.clone().add(Math.random() * 60 * 12, "minutes");
      
      try {
        const result = await this.createCommit(commitTime);
        results.push(result);

        // Small delay between commits
        await this.sleep(100);
      } catch (error) {
        logger.error(`Failed to create commit ${i + 1}/${commitCount}`, {
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Backfill contributions for a date range
   */
  async backfillContributions(startDate, endDate, options = {}) {
    const start = moment(startDate);
    const end = moment(endDate);
    const skipWeekends = options.skipWeekends ?? CONFIG.backfill.skipWeekends;
    const minCommits = options.minCommits ?? CONFIG.backfill.minCommits;
    const maxCommits = options.maxCommits ?? CONFIG.backfill.maxCommits;

    logger.info("Starting backfill operation", {
      startDate: start.format("YYYY-MM-DD"),
      endDate: end.format("YYYY-MM-DD"),
      skipWeekends,
      minCommits,
      maxCommits,
    });

    const stats = {
      totalDays: 0,
      totalCommits: 0,
      skippedDays: 0,
      errors: 0,
    };

    const current = start.clone();

    while (current.isSameOrBefore(end)) {
      const dayOfWeek = current.day();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (skipWeekends && isWeekend) {
        logger.debug("Skipping weekend", { date: current.format("YYYY-MM-DD") });
        stats.skippedDays++;
        current.add(1, "day");
        continue;
      }

      // Random number of commits for this day
      const commitCount = Math.floor(Math.random() * (maxCommits - minCommits + 1)) + minCommits;
      
      logger.info(`Processing ${current.format("YYYY-MM-DD")} with ${commitCount} commits`);

      for (let i = 0; i < commitCount; i++) {
        try {
          // Random time during the day (9 AM - 9 PM)
          const commitTime = current.clone()
            .hour(9 + Math.floor(Math.random() * 12))
            .minute(Math.floor(Math.random() * 60));

          await this.createCommit(commitTime);
          stats.totalCommits++;

          await this.sleep(50);
        } catch (error) {
          stats.errors++;
          logger.error("Backfill commit failed", {
            date: current.format("YYYY-MM-DD"),
            error: error.message,
          });
        }
      }

      stats.totalDays++;
      current.add(1, "day");

      // Progress log every 7 days
      if (stats.totalDays % 7 === 0) {
        logger.info("Backfill progress", stats);
      }
    }

    logger.info("Backfill completed", stats);
    return stats;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export default new CommitService();
