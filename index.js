import jsonfile from "jsonfile";
import moment from "moment";
import simpleGit from "simple-git";
import random from "random";

// Configuration
const CONFIG = {
  dataFile: "./data.json",
  commitsCount: 50,
  yearsBack: 1,
  weeksRange: 54,
  daysRange: 7,
};

const git = simpleGit();

/**
 * Generate a random date within the contribution graph range
 * @param {number} weeksBack - Number of weeks back from today
 * @param {number} dayOfWeek - Day of the week (0-6, Sunday-Saturday)
 * @returns {string} Formatted date string
 */
const generateDate = (weeksBack, dayOfWeek) => {
  return moment()
    .subtract(CONFIG.yearsBack, "y")
    .add(1, "d")
    .add(weeksBack, "w")
    .add(dayOfWeek, "d")
    .format();
};

/**
 * Write data to JSON file
 * @param {object} data - Data to write
 * @returns {Promise<void>}
 */
const writeData = (data) => {
  return new Promise((resolve, reject) => {
    jsonfile.writeFile(CONFIG.dataFile, data, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

/**
 * Create a single commit with a specific date
 * @param {string} date - The date for the commit
 * @returns {Promise<void>}
 */
const createCommit = async (date) => {
  const data = { date };
  
  await writeData(data);
  await git.add([CONFIG.dataFile]);
  await git.commit(date, { "--date": date });
  
  console.log(`✓ Commit created: ${date}`);
};

/**
 * Mark a specific position on the contribution graph
 * @param {number} week - Week number (0-53)
 * @param {number} day - Day of week (0-6)
 * @returns {Promise<void>}
 */
const markCommit = async (week, day) => {
  const date = generateDate(week, day);
  await createCommit(date);
};

/**
 * Generate random commits to fill the contribution graph
 * @param {number} count - Number of commits to create
 * @returns {Promise<void>}
 */
const makeRandomCommits = async (count) => {
  console.log(`\n🚀 Starting to create ${count} random commits...\n`);
  
  for (let i = 0; i < count; i++) {
    const week = random.int(0, CONFIG.weeksRange - 1);
    const day = random.int(0, CONFIG.daysRange - 1);
    const date = generateDate(week, day);
    
    await createCommit(date);
    
    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${count} commits\n`);
    }
  }
  
  console.log(`\n✅ All ${count} commits created successfully!`);
};

/**
 * Push all commits to remote repository
 * @returns {Promise<void>}
 */
const pushCommits = async () => {
  console.log("\n📤 Pushing commits to remote...");
  await git.push();
  console.log("✅ Push completed!");
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    console.log("=".repeat(50));
    console.log("   GitHub Contribution Graph Generator");
    console.log("=".repeat(50));
    
    await makeRandomCommits(CONFIG.commitsCount);
    await pushCommits();
    
    console.log("\n🎉 Done! Check your GitHub profile.");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
};

// Run the script
main();
