/**
 * This script is used to stalk your faction mates and keep track of their stats. It will compare
 * their current stats to their stats at the beginning of the month and output a report with the
 * changes.
 * 
 * There are various flags you can use to customize the script:
 *   --debug: Only check the first faction member for testing purposes.
 *   --charts: Generate bar charts for each stat.
 *   --save: Save a snapshot of the current data to a JSON file.
 *   --text: Generate a text report in the console.
 *   --load: Load data from a JSON file instead of making API requests.
 *   --faction: Specify a faction ID to check a specific faction.
 * 
 * Example usage:
 *   node src/scripts/stalkFactionMates.js --debug --charts --save --text --load output/snapshots/your_faction_snapshot_2021-09-01.json
 */

import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sleep from '../helpers/sleep.js';

import {
  getFactionInfo,
  getFactionMembers,
  getCurrentStats,
  getHistoricalStats,
  compareStats
} from '../helpers/tornApiHelpers.js';

import {
  exportCSV,
  generateBarChart,
  generatePDFReport,
  generateTextReport
} from '../helpers/outputHelpers.js';

const DEBUG_MODE = process.argv.includes('--debug');
const GENERATE_CHARTS = process.argv.includes('--charts');
const SAVE_MODE = process.argv.includes('--save');
const GENERATE_TEXT = process.argv.includes('--text');

const loadFileArgIndex = process.argv.findIndex(arg => arg === '--load');
const LOAD_FROM_FILE = loadFileArgIndex !== -1 ? process.argv[loadFileArgIndex + 1] : null;

const factionFlagIndex = process.argv.findIndex(arg => arg === '--faction');
const FACTION_ID = factionFlagIndex !== -1 ? process.argv[factionFlagIndex + 1] : null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../../settings.json'), 'utf-8'));
const chartDir = path.join(__dirname, '../../output/charts');
const reportDir = path.join(__dirname, '../../output/reports');
const snapshotDir = path.join(__dirname, '../../output/snapshots');

// Create directories if they don't exist
if (!fs.existsSync(chartDir)) fs.mkdirSync(chartDir, { recursive: true });
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });

const API_KEY = settings.api_key;
const STAT_KEYS = [
  'moneymugged', 'respectforfaction', 'alcoholused', 'energydrinkused',
  'xantaken', 'networth', 'timeplayed', 'awards', 'refills'
];

(async () => {
  const today = dayjs();
  const startOfMonth = (today.date() === 1 ? today.subtract(1, 'month') : today).startOf('month').unix();
  console.log(`📅 Start of month: ${dayjs.unix(startOfMonth).format('YYYY-MM-DD')}`);

  let members = [];
  let results = [];
  let factionName = '';

  if (LOAD_FROM_FILE) {
    console.log(`📂 Loading data from ${LOAD_FROM_FILE}...`);
    const loaded = JSON.parse(fs.readFileSync(LOAD_FROM_FILE, 'utf-8'));
    members = loaded.members;
    results = loaded.results;
  } else {
    if (FACTION_ID) {
      const info = await getFactionInfo(FACTION_ID, API_KEY);
      factionName = info.name?.replace(/\s+/g, '_') || `faction_${FACTION_ID}`;
      members = await getFactionMembers(FACTION_ID, API_KEY);
    } else {
      factionName = 'your_faction';
      members = await getFactionMembers(null, API_KEY);
    }
  }

  if (DEBUG_MODE) {
    members = [members[10]];
    console.log(`🔍 Debug mode enabled – only checking ${members[0].name} (${members[0].id})\n`);
  } else {
    console.log(`📊 Checking all ${members.length} faction members...\n`);
  }

  if (!LOAD_FROM_FILE) {
    for (const member of members) {
      const { id, name } = member;
      console.log(`➡️ ${name} (${id})`);
      try {
        const [current, past] = await Promise.all([
          getCurrentStats(id, API_KEY, DEBUG_MODE),
          getHistoricalStats(id, startOfMonth, API_KEY, DEBUG_MODE)
        ]);

        const delta = compareStats(current, past, STAT_KEYS);
        for (const key of STAT_KEYS) {
          console.log(`   ${key.padEnd(20)}: +${delta[key]}`);
        }
        console.log('');

        results.push({ name, id, ...delta, current });
        await sleep(1000);
      } catch (err) {
        console.error(`   ❌ Failed to get stats for ${name}:`, err.response?.data?.error || err.message);
      }
    }

    if (SAVE_MODE) {
      const snapshotName = `${factionName}_snapshot_${dayjs().format('YYYY-MM-DD')}`;
      const jsonPath = path.join(snapshotDir, `${snapshotName}.json`);
      const csvPath = path.join(snapshotDir, `${snapshotName}.csv`);

      fs.writeFileSync(jsonPath, JSON.stringify({ members, results }, null, 2));
      exportCSV(results, STAT_KEYS, csvPath);
    }
  }

  if (GENERATE_CHARTS) {
    console.log(`\n🖼 Generating charts...\n`);
    for (const stat of STAT_KEYS) {
      await generateBarChart(results, stat, `chart_${stat}`);
    }

    const reportMonth = dayjs().startOf('month').format('MMMM_YYYY');
    const pdfPath = path.join(reportDir, `Monthly_Report_${factionName}_${reportMonth}.pdf`);
    generatePDFReport(results, STAT_KEYS, chartDir, pdfPath);
  }

  if (GENERATE_TEXT) {
    generateTextReport(results, STAT_KEYS);
  }
})();
