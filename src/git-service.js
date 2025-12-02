/**
 * Git Service
 * Handles all git operations with retry logic and error handling
 */

import simpleGit from "simple-git";
import { CONFIG } from "./config.js";
import logger from "./logger.js";

class GitService {
  constructor() {
    this.git = simpleGit({
      maxConcurrentProcesses: 1,
      timeout: {
        block: 30000,
      },
    });
    this.initialized = false;
  }

  /**
   * Initialize git repository and configure user
   */
  async initialize() {
    try {
      logger.info("Initializing Git service...");

      // Check if already a git repo
      const isRepo = await this.git.checkIsRepo();
      
      if (!isRepo) {
        logger.info("Initializing new git repository");
        await this.git.init();
      }

      // Configure user
      await this.git.addConfig("user.name", CONFIG.git.userName);
      await this.git.addConfig("user.email", CONFIG.git.userEmail);

      // Check for remote
      const remotes = await this.git.getRemotes(true);
      const hasOrigin = remotes.some((r) => r.name === CONFIG.git.remoteName);

      if (!hasOrigin && CONFIG.git.repoUrl) {
        logger.info(`Adding remote: ${CONFIG.git.remoteName}`);
        await this.git.addRemote(CONFIG.git.remoteName, CONFIG.git.repoUrl);
      }

      this.initialized = true;
      logger.info("Git service initialized successfully");
      
      return true;
    } catch (error) {
      logger.error("Failed to initialize Git service", { error: error.message });
      throw error;
    }
  }

  /**
   * Stage files for commit
   */
  async add(files) {
    await this.ensureInitialized();
    
    try {
      await this.git.add(files);
      logger.debug("Files staged", { files });
    } catch (error) {
      logger.error("Failed to stage files", { files, error: error.message });
      throw error;
    }
  }

  /**
   * Create a commit with optional custom date
   */
  async commit(message, options = {}) {
    await this.ensureInitialized();

    try {
      const commitOptions = {};
      
      if (options.date) {
        commitOptions["--date"] = options.date;
      }

      if (CONFIG.app.dryRun) {
        logger.info("[DRY RUN] Would commit", { message, options });
        return { commit: "dry-run", summary: { changes: 0 } };
      }

      const result = await this.git.commit(message, commitOptions);
      logger.debug("Commit created", { message, commit: result.commit });
      
      return result;
    } catch (error) {
      logger.error("Failed to create commit", { message, error: error.message });
      throw error;
    }
  }

  /**
   * Push commits to remote with retry logic
   */
  async push(options = {}) {
    await this.ensureInitialized();

    const maxRetries = CONFIG.app.retryAttempts;
    const retryDelay = CONFIG.app.retryDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (CONFIG.app.dryRun) {
          logger.info("[DRY RUN] Would push to remote");
          return { pushed: true };
        }

        const remote = options.remote || CONFIG.git.remoteName;
        const branch = options.branch || CONFIG.git.branch;

        logger.info(`Pushing to ${remote}/${branch} (attempt ${attempt}/${maxRetries})`);
        
        const result = await this.git.push(remote, branch, {
          "--set-upstream": null,
        });

        logger.info("Push successful");
        return result;
      } catch (error) {
        // If remote doesn't exist, log warning but don't fail
        if (
          error.message.includes("does not appear to be a git repository") ||
          error.message.includes("repository not found") ||
          error.message.includes("Could not read from remote")
        ) {
          logger.warn("Remote repository not available. Commits saved locally.", { 
            error: error.message,
            hint: "Create the remote repository and push manually with: git push -u origin master"
          });
          return { pushed: false, local: true };
        }

        logger.warn(`Push attempt ${attempt} failed`, { error: error.message });

        if (attempt === maxRetries) {
          logger.error("All push attempts failed", { error: error.message });
          throw error;
        }

        // Wait before retry
        await this.sleep(retryDelay * attempt);
      }
    }
  }

  /**
   * Pull latest changes from remote
   */
  async pull(options = {}) {
    await this.ensureInitialized();

    try {
      const remote = options.remote || CONFIG.git.remoteName;
      const branch = options.branch || CONFIG.git.branch;

      if (CONFIG.app.dryRun) {
        logger.info("[DRY RUN] Would pull from remote");
        return {};
      }

      const result = await this.git.pull(remote, branch, {
        "--rebase": "true",
      });

      logger.info("Pull successful", { summary: result.summary });
      return result;
    } catch (error) {
      // Ignore common errors when remote doesn't exist yet
      if (
        error.message.includes("no tracking information") ||
        error.message.includes("couldn't find remote ref") ||
        error.message.includes("does not appear to be a git repository") ||
        error.message.includes("repository not found") ||
        error.message.includes("unstaged changes") ||
        error.message.includes("You have unstaged changes")
      ) {
        logger.debug("Remote not available or local changes, skipping pull", { reason: error.message });
        return {};
      }
      logger.error("Failed to pull", { error: error.message });
      throw error;
    }
  }

  /**
   * Get current status
   */
  async status() {
    await this.ensureInitialized();
    return this.git.status();
  }

  /**
   * Get commit log
   */
  async log(options = {}) {
    await this.ensureInitialized();
    return this.git.log(options);
  }

  /**
   * Ensure service is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export default new GitService();
