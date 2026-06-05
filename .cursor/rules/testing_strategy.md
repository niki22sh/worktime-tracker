# Testing Strategy — Worktime Tracker

## Framework
**Jest 29** — zero config, built-in coverage, assertion library, and mocking.

## Test Structure

```
tests/
├── unit/                        # One file per module
│   ├── validators.test.js       # ~24 tests
│   ├── dateUtils.test.js        # ~22 tests
│   ├── EventEmitter.test.js     # ~9 tests
│   ├── Employee.test.js         # ~18 tests
│   ├── TimeEntry.test.js        # ~17 tests
│   ├── Leave.test.js            # ~18 tests
│   ├── repositories.test.js     # ~30 tests (all 3 repos)
│   ├── OvertimeStrategy.test.js # ~18 tests
│   ├── EmployeeService.test.js  # ~28 tests
│   ├── TimeTrackingService.test.js # ~28 tests
│   ├── LeaveService.test.js     # ~27 tests
│   └── ReportService.test.js    # ~36 tests
└── integration/
    └── workflows.test.js        # ~24 tests (12 complete scenarios)
```

**Total: 200+ tests**

## Coverage Requirements

| Metric     | Threshold |
|------------|-----------|
| Lines      | ≥ 70 %    |
| Branches   | ≥ 70 %    |
| Functions  | ≥ 70 %    |
| Statements | ≥ 70 %    |

## Commands

```bash
# Run all tests with HTML + LCOV coverage
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# CI mode (generates junit.xml + cobertura for SonarQube)
npm run test:ci
```

## Generated Reports

| Report | Path | Purpose |
|--------|------|---------|
| HTML coverage | `coverage/lcov-report/index.html` | Visual line-by-line coverage |
| LCOV | `coverage/lcov.info` | SonarCloud import |
| Cobertura XML | `coverage/cobertura-coverage.xml` | SonarCloud import |
| JUnit XML | `reports/junit.xml` | CI test result display |

## AI Instructions for Writing Tests

When generating a new test file:
1. Import the module under test and its dependencies.
2. Create an `InMemory*` repository — NEVER mock repositories.
3. Use `jest.fn()` only for EventEmitter listener assertions.
4. Include both **happy path** and **edge cases** (empty string, null, invalid date, boundary values).
5. Group tests in `describe` blocks matching the method name.
6. Each `it` description must be a complete sentence starting with a verb.
7. Reset state in `beforeEach` using `repo.clear()` or by constructing fresh instances.

## Edge Cases Checklist

- [ ] Empty / whitespace strings
- [ ] null / undefined inputs
- [ ] Invalid Date objects
- [ ] Boundary dates (same day start/end)
- [ ] Overlapping date ranges
- [ ] clockOut before clockIn
- [ ] Double clock-in prevention
- [ ] Blocked employee actions
- [ ] Non-existent IDs
- [ ] Zero hourly rate
- [ ] 0 overtime hours (worked ≤ regular)
- [ ] Strategy swap mid-report
