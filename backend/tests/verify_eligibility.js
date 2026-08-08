import { evaluateEligibility } from '../src/utils/eligibilityEngine.js';

// Mock Scheme Rules (seeded in database)
const pmKisanRules = {
  occupation: 'farmer',
  max_income: 300000,
  min_age: 18,
  gender: 'any'
};

const ladliBehnaRules = {
  gender: 'female',
  min_age: 21,
  max_age: 60,
  max_income: 250000,
  occupation: 'any'
};

const testCases = [
  {
    name: 'Eligible Female Farmer for PM-Kisan & Ladli Behna',
    profile: {
      age: 25,
      gender: 'female',
      income: 120000,
      occupation: 'farmer'
    },
    expectedPmKisan: true,
    expectedLadliBehna: true
  },
  {
    name: 'Underage female for Ladli Behna',
    profile: {
      age: 18,
      gender: 'female',
      income: 100000,
      occupation: 'farmer'
    },
    expectedPmKisan: true,
    expectedLadliBehna: false
  },
  {
    name: 'Male Corporate Employee (High Income)',
    profile: {
      age: 40,
      gender: 'male',
      income: 800000,
      occupation: 'corporate'
    },
    expectedPmKisan: false,
    expectedLadliBehna: false
  }
];

const runTests = () => {
  console.log('==================================================');
  console.log(' Running Integration Tests: Eligibility Matching');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  testCases.forEach((tc, idx) => {
    console.log(`\nTest Case ${idx + 1}: ${tc.name}`);
    console.log(`Profile:`, tc.profile);

    const pmKisanRes = evaluateEligibility(tc.profile, pmKisanRules);
    const ladliBehnaRes = evaluateEligibility(tc.profile, ladliBehnaRules);

    const pmKisanPass = pmKisanRes.isEligible === tc.expectedPmKisan;
    const ladliBehnaPass = ladliBehnaRes.isEligible === tc.expectedLadliBehna;

    if (pmKisanPass) {
      console.log(`  ✓ PM-Kisan Match PASSED (Expected: ${tc.expectedPmKisan}, Got: ${pmKisanRes.isEligible})`);
      passed++;
    } else {
      console.log(`  ✗ PM-Kisan Match FAILED (Expected: ${tc.expectedPmKisan}, Got: ${pmKisanRes.isEligible})`);
      console.log(`    Reasons:`, pmKisanRes.reasons);
      failed++;
    }

    if (ladliBehnaPass) {
      console.log(`  ✓ Ladli Behna Match PASSED (Expected: ${tc.expectedLadliBehna}, Got: ${ladliBehnaRes.isEligible})`);
      passed++;
    } else {
      console.log(`  ✗ Ladli Behna Match FAILED (Expected: ${tc.expectedLadliBehna}, Got: ${ladliBehnaRes.isEligible})`);
      console.log(`    Reasons:`, ladliBehnaRes.reasons);
      failed++;
    }
  });

  console.log('\n==================================================');
  console.log(` Tests Completed: Passed ${passed}, Failed ${failed}`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests();
