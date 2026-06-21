import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * This script compares the current mutation score against a baseline JSON file.
 * It is intended to be run in CI (e.g., GitHub Actions) on pull requests.
 */

const BASELINE_PATH = resolve(process.cwd(), 'docs/mutation-baseline.json');
const REPORT_PATH = resolve(process.cwd(), 'reports/mutation/mutation.json');

function compareScores() {
    try {
        console.log('Reading baseline...');
        const baselineData = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'));
        const baselineScore = baselineData.mutationScore;

        console.log('Reading current report...');
        const reportContent = JSON.parse(readFileSync(REPORT_PATH, 'utf-8'));

        // Calculate current score
        let totalMutants = 0;
        let killedMutants = 0;

        for (const file of Object.values(reportContent.files)) {
            totalMutants += file.mutants.length;
            killedMutants += file.mutants.filter((m: any) => m.status === 'Killed').length;
        }

        const currentScore = totalMutants > 0 ? (killedMutants / totalMutants) * 100 : 0;
        const delta = currentScore - baselineScore;
        const epsilon = 0.01;

        console.log('\n--- Mutation Score Comparison ---');
        console.log(`Baseline Score: ${baselineScore}%`);
        console.log(`Current Score:  ${currentScore.toFixed(2)}%`);
        console.log(`Delta:          ${delta.toFixed(2)}%`);
        console.log('---------------------------------\n');

        if (Math.abs(delta) < epsilon) {
            console.log('✅ No change in mutation score.');
        } else if (delta < 0) {
            console.error('❌ FAILURE: Mutation score has decreased!');
            process.exit(1);
        } else {
            console.log('✅ Mutation score increased!');
        }

    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.error('Error: Could not find the required files (baseline or report).');
            console.error(`Check if: ${BASELINE_PATH} and ${REPORT_PATH} exist.`);
        } else {
            console.error('An error occurred during comparison:', error.message);
        }
        process.exit(1);
    }
}

compareScores();
