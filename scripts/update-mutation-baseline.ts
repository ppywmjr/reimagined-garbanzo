import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * This script runs mutation tests and updates the baseline JSON file.
 * It should be run on the main branch after a successful merge.
 */

const BASELINE_PATH = resolve(process.cwd(), 'docs/mutation-baseline.json');
const REPORT_PATH = resolve(process.cwd(), 'reports/mutation/mutation.json');

// Note: Stryker's JSON reporter output location might vary depending on the version/config.
// We will check for common locations or allow it to be passed as an argument if needed.

function updateBaseline() {
    try {
        console.log('Running mutation tests...');
        // Run the mutation test command
        execSync('pnpm run mutate', { stdio: 'inherit' });

        // Load the report
        const reportContent = JSON.parse(readFileSync(REPORT_PATH, 'utf-8'));

        // Calculate metrics
        let totalMutants = 0;
        let killedMutants = 0;

        for (const file of Object.values(reportContent.files)) {
            totalMutants += file.mutants.length;
            killedMutants += file.mutants.filter((m: any) => m.status === 'Killed').length;
        }

        const mutationScore = totalMutants > 0 ? (killedMutants / totalMutants) * 100 : 0;

        const baseline = {
            timestamp: new Date().toISOString(),
            mutationScore: parseFloat(mutationScore.toFixed(2)),
            totalMutants,
            killedMutants,
            survivedMutants: totalMutants - killedMutants,
        };

        console.log('Updating baseline with new metrics:');
        console.table(baseline);

        // Ensure the directory exists
        const dir = resolve(process.cwd(), 'docs');

        writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2), 'utf-8');
        console.log(`Successfully updated baseline at: ${BASELINE_PATH}`);

    } catch (error) {
        console.error('Error updating baseline:', error);
        process.exit(1);
    }
}

updateBaseline();
