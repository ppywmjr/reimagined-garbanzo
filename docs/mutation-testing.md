# Mutation Testing

This repository uses mutation testing to ensure the effectiveness of our test suite. While code coverage tells us which lines are executed, mutation testing tells us if our tests actually catch bugs by injecting faults (mutants) into the source code.

## The "Source of Truth"

We maintain a baseline for our mutation score in `docs/mutation-baseline.json`. This file represents the current "gold standard" for our project's test effectiveness.

- **Baseline Score**: The mutation score from the `main` branch.
- **Total Mutants**: Total number of mutants generated during the last baseline run.

---

## Workflow

### 1. Updating the Baseline (on `main`)

When a significant change is merged into the `main` branch, we update our baseline to reflect the new state of the project. This ensures that future PRs compare against the most up-to-date test effectiveness.

**Command:**
```bash
pnpm run mutate:baseline
```

**Steps:**
1. Ensure you are on the `main` branch.
2. Run the command above.
3. Commit and push the updated `docs/mutation-baseline.json` to `main`.

### 2. Comparing Scores (on Pull Requests)

When working on a feature branch or opening a pull request, we run the comparison script to ensure that new changes haven't caused a regression in our mutation score.

**Command:**
```bash
pnpm run mutate:compare
```

**Expected Results:**
- **Success**: If the mutation score is equal to or higher than the baseline.
- **Failure**: If the mutation score has decreased (a negative delta).

This check is automated in our CI/CD pipeline via `.github/workflows/mutation-check.yml`.
