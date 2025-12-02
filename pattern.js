import jsonfile from "jsonfile";
import moment from "moment";
import simpleGit from "simple-git";

// Configuration
const CONFIG = {
  dataFile: "./data.json",
  yearsBack: 1,
  commitsPerCell: 5, // Number of commits per "pixel" for intensity
};

const git = simpleGit();

/**
 * Pattern definitions - 7 rows (days) x variable columns (weeks)
 * Use 1 for filled, 0 for empty
 * Row 0 = Sunday, Row 6 = Saturday
 */
const PATTERNS = {
  // Simple heart pattern
  heart: [
    [0, 1, 1, 0, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
  ],
  
  // "HI" text
  hi: [
    [1, 0, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 0],
    [1, 1, 1, 0, 0, 1, 0],
    [1, 0, 1, 0, 0, 1, 0],
    [1, 0, 1, 0, 0, 1, 0],
    [1, 0, 1, 0, 0, 1, 0],
    [1, 0, 1, 0, 1, 1, 1],
  ],

  // Smiley face
  smiley: [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
  ],

  // Checkerboard pattern
  checkerboard: [
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
  ],

  // Wave pattern
  wave: [
    [0, 0, 0, 1, 0, 0, 0, 1],
    [0, 0, 1, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 1, 0, 0],
    [1, 0, 0, 0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0, 0, 0, 1],
  ],
};

/**
 * Generate a date for a specific position on the contribution graph
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
 * Create a commit with a specific date
 */
const createCommit = async (date) => {
  const data = { date, timestamp: Date.now() };
  
  await writeData(data);
  await git.add([CONFIG.dataFile]);
  await git.commit(date, { "--date": date });
};

/**
 * Draw a pattern on the contribution graph
 * @param {string} patternName - Name of the pattern to draw
 * @param {number} startWeek - Starting week offset (0-53)
 */
const drawPattern = async (patternName, startWeek = 0) => {
  const pattern = PATTERNS[patternName];
  
  if (!pattern) {
    console.error(`❌ Pattern "${patternName}" not found!`);
    console.log(`Available patterns: ${Object.keys(PATTERNS).join(", ")}`);
    return;
  }
  
  console.log(`\n🎨 Drawing pattern: ${patternName}`);
  console.log(`Starting at week: ${startWeek}\n`);
  
  const totalCells = pattern.flat().filter(cell => cell === 1).length;
  const totalCommits = totalCells * CONFIG.commitsPerCell;
  let currentCommit = 0;
  
  // Pattern has 7 rows (days) and variable columns (weeks)
  const weeks = pattern[0].length;
  
  for (let week = 0; week < weeks; week++) {
    for (let day = 0; day < 7; day++) {
      if (pattern[day] && pattern[day][week] === 1) {
        const date = generateDate(startWeek + week, day);
        
        // Create multiple commits for intensity
        for (let i = 0; i < CONFIG.commitsPerCell; i++) {
          await createCommit(date);
          currentCommit++;
        }
        
        console.log(`✓ Week ${week}, Day ${day} - ${CONFIG.commitsPerCell} commits`);
      }
    }
  }
  
  console.log(`\n📊 Total commits created: ${currentCommit}`);
};

/**
 * Push commits to remote
 */
const pushCommits = async () => {
  console.log("\n📤 Pushing to remote...");
  await git.push();
  console.log("✅ Push completed!");
};

/**
 * Main execution
 */
const main = async () => {
  try {
    // Get pattern name from command line args or default to 'heart'
    const patternName = process.argv[2] || "heart";
    const startWeek = parseInt(process.argv[3]) || 10;
    
    console.log("=".repeat(50));
    console.log("   GitHub Contribution Pattern Generator");
    console.log("=".repeat(50));
    console.log(`\nAvailable patterns: ${Object.keys(PATTERNS).join(", ")}`);
    console.log(`Usage: npm run pattern <pattern-name> <start-week>\n`);
    
    await drawPattern(patternName, startWeek);
    await pushCommits();
    
    console.log("\n🎉 Done! Check your GitHub profile.");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
};

main();
