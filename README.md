# GitHub Contributions Generator

A robust, production-ready system for generating GitHub contribution commits. Supports scheduled execution, backfilling past dates, and multiple deployment options.

## Features

- 🚀 **Automated Daily Commits** - Schedule commits to run automatically
- 📅 **Backfill Support** - Fill in past contribution dates
- 🐳 **Docker Ready** - Easy deployment with Docker/Docker Compose
- ⚙️ **GitHub Actions** - Run directly in GitHub's infrastructure
- 🔒 **Production Ready** - Proper logging, error handling, and health checks
- ⏰ **Flexible Scheduling** - Cron-based scheduling with timezone support
- 📊 **Health Monitoring** - HTTP endpoints for monitoring and manual triggers

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Run

```bash
# Single execution (create today's commits)
npm start

# Dry run (no actual commits)
npm run dry-run
```

## Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `GIT_USER_NAME` | Git commit author name | Required |
| `GIT_USER_EMAIL` | Git commit author email | Required |
| `GIT_REPO_URL` | Repository URL | Required for production |
| `MIN_COMMITS_PER_DAY` | Minimum daily commits | 1 |
| `MAX_COMMITS_PER_DAY` | Maximum daily commits | 5 |
| `SCHEDULE_ENABLED` | Enable scheduled mode | false |
| `SCHEDULE_CRON` | Cron expression | `0 9 * * *` (9 AM daily) |
| `SCHEDULE_TIMEZONE` | Timezone for schedule | UTC |

## Deployment Options

### Option 1: GitHub Actions (Recommended - FREE!)

The easiest way - runs in GitHub's infrastructure for free!

1. Push this code to a GitHub repository
2. Go to **Settings** → **Actions** → **General**
3. Enable "Read and write permissions" under Workflow permissions
4. The workflow runs daily at 9 AM UTC
5. Or trigger manually from **Actions** → **Daily Contribution** → **Run workflow**

### Option 2: Docker

```bash
# Build image
docker build -t github-contributions .

# Run container
docker run -d \
  --name github-contributions \
  --env-file .env \
  -p 3000:3000 \
  github-contributions
```

### Option 3: Docker Compose

```bash
# Start service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

### Option 4: Cloud Platforms

#### Railway / Render / Fly.io

1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy!

#### AWS / GCP / Azure

Use the provided Dockerfile with your preferred container service (ECS, Cloud Run, Container Apps).

### Option 5: Local Scheduled Mode

```bash
# Start as a service with scheduling
npm run scheduled
```

## Usage Modes

### Single Execution
Creates commits for today and exits:
```bash
npm start
# or
npm run once
```

### Scheduled Mode
Runs continuously, creating commits on schedule:
```bash
npm run scheduled
```

### Backfill Mode
Fill in past dates:
```bash
# Set these in your .env file:
# BACKFILL_ENABLED=true
# BACKFILL_START_DATE=2024-01-01
# BACKFILL_END_DATE=2024-12-31
npm run backfill
```

### Dry Run
Test without making actual commits:
```bash
npm run dry-run
```

## API Endpoints

When `HEALTH_ENABLED=true`, the following endpoints are available:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health check |
| `/status` | GET | Detailed status and stats |
| `/trigger` | POST | Manually trigger commits |

```bash
# Check health
curl http://localhost:3000/health

# Get status
curl http://localhost:3000/status

# Trigger manually
curl -X POST http://localhost:3000/trigger
```

## Project Structure

```
├── src/
│   ├── index.js          # Main entry point
│   ├── config.js         # Configuration management
│   ├── logger.js         # Logging service
│   ├── git-service.js    # Git operations
│   ├── commit-service.js # Commit creation logic
│   ├── scheduler.js      # Cron scheduling
│   └── health-server.js  # HTTP health endpoints
├── .github/
│   └── workflows/
│       └── daily-contribution.yml  # GitHub Actions workflow
├── Dockerfile            # Docker image definition
├── docker-compose.yml    # Docker Compose configuration
├── .env.example          # Environment template
└── package.json
```

## Troubleshooting

### Commits not showing on GitHub profile

1. Make sure "Private contributions" is enabled in your GitHub profile settings
2. Verify the email in `GIT_USER_EMAIL` matches your GitHub account
3. Check that commits are actually being pushed (`git log`)

### Authentication Issues

For HTTPS repositories, you may need to:
- Use a Personal Access Token (PAT) in the URL: `https://TOKEN@github.com/user/repo.git`
- Or configure Git credentials manager

### Docker Issues

```bash
# View logs
docker logs github-contributions

# Enter container
docker exec -it github-contributions sh
```

## License

MIT
