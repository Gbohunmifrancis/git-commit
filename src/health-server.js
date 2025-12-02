/**
 * Health Check Server
 * Provides HTTP endpoints for monitoring and health checks
 */

import http from "http";
import { CONFIG } from "./config.js";
import logger from "./logger.js";
import scheduler from "./scheduler.js";

class HealthServer {
  constructor() {
    this.server = null;
  }

  /**
   * Handle incoming requests
   */
  handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    switch (url.pathname) {
      case "/health":
      case "/":
        this.handleHealth(req, res);
        break;

      case "/status":
        this.handleStatus(req, res);
        break;

      case "/trigger":
        this.handleTrigger(req, res);
        break;

      default:
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Not found" }));
    }
  }

  /**
   * Health check endpoint
   */
  handleHealth(req, res) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      })
    );
  }

  /**
   * Detailed status endpoint
   */
  handleStatus(req, res) {
    const status = scheduler.getStatus();
    
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        application: "github-contributions-generator",
        version: process.env.npm_package_version || "1.0.0",
        environment: CONFIG.app.env,
        scheduler: status,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Manual trigger endpoint
   */
  async handleTrigger(req, res) {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "Method not allowed. Use POST." }));
      return;
    }

    try {
      logger.info("Manual trigger received via HTTP");
      
      // Run in background
      scheduler.runNow().catch((error) => {
        logger.error("Manual trigger failed", { error: error.message });
      });

      res.statusCode = 202;
      res.end(
        JSON.stringify({
          message: "Task triggered successfully",
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Start the health check server
   */
  start() {
    if (this.server) {
      logger.warn("Health server already running");
      return;
    }

    const port = CONFIG.health.port;

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(port, () => {
      logger.info(`Health server listening on port ${port}`);
      logger.info(`Endpoints: /health, /status, /trigger (POST)`);
    });

    this.server.on("error", (error) => {
      logger.error("Health server error", { error: error.message });
    });
  }

  /**
   * Stop the health check server
   */
  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      logger.info("Health server stopped");
    }
  }
}

// Export singleton instance
export default new HealthServer();
