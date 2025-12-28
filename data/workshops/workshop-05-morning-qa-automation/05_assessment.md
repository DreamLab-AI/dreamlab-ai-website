# Assessment: QA Automation Knowledge Check

## Part 1: Multiple Choice (30 points)

### Question 1 (3 points)
What is the recommended distribution in the Testing Pyramid?

A) 50% Unit, 30% Integration, 20% E2E
B) 60% Unit, 30% Integration, 10% E2E
C) 40% Unit, 40% Integration, 20% E2E
D) 70% E2E, 20% Integration, 10% Unit

**Answer: B**

### Question 2 (3 points)
Which coverage metric measures the percentage of decision paths tested?

A) Line coverage
B) Branch coverage
C) Function coverage
D) Statement coverage

**Answer: B**

### Question 3 (3 points)
What is the purpose of mutation testing?

A) Test database mutations
B) Verify tests catch actual bugs
C) Test API mutations
D) Check for code mutations

**Answer: B**

### Question 4 (3 points)
In the AAA pattern, what does the second 'A' stand for?

A) Assert
B) Analyze
C) Act
D) Arrange

**Answer: C**

### Question 5 (3 points)
Which tool is best suited for E2E browser testing?

A) Vitest
B) Jest
C) Playwright
D) Mocha

**Answer: C**

### Question 6 (3 points)
What is a flaky test?

A) A test that sometimes passes and sometimes fails
B) A test that runs slowly
C) A test with low coverage
D) A test without assertions

**Answer: A**

### Question 7 (3 points)
What is the recommended minimum code coverage for production code?

A) 60%
B) 70%
C) 80%
D) 100%

**Answer: C**

### Question 8 (3 points)
Which testing level uses mocked external services?

A) Unit tests
B) Integration tests
C) E2E tests
D) Visual tests

**Answer: B**

### Question 9 (3 points)
What does CI/CD stand for?

A) Code Integration / Code Deployment
B) Continuous Integration / Continuous Deployment
C) Central Integration / Central Deployment
D) Complete Integration / Complete Deployment

**Answer: B**

### Question 10 (3 points)
Which is NOT a benefit of automated testing?

A) Faster feedback cycles
B) Consistent test execution
C) Eliminates need for manual testing
D) Catches regressions early

**Answer: C** (Automated testing complements, not replaces, manual testing)

## Part 2: Code Analysis (30 points)

### Question 11 (10 points)
Identify the problems in this test:

```javascript
let userId;

test('creates user', async () => {
  userId = await createUser({ name: 'John' });
});

test('updates user', async () => {
  await updateUser(userId, { name: 'Jane' });
  expect(true).toBe(true);
});
```

**Problems:**
1. Tests are not independent (second depends on first)
2. Weak assertion `expect(true).toBe(true)`
3. No verification of actual update
4. Shared state between tests
5. Will fail if first test fails

### Question 12 (10 points)
Fix this test to follow best practices:

```javascript
test('test', () => {
  const x = add(2, 3);
  expect(x).toBe(5);
});
```

**Fixed version:**
```javascript
test('should return sum of two positive numbers', () => {
  // Arrange
  const a = 2;
  const b = 3;
  const expected = 5;

  // Act
  const result = add(a, b);

  // Assert
  expect(result).toBe(expected);
});
```

**Improvements:**
- Descriptive test name
- AAA pattern
- Clear variable names
- Explicit expectations

### Question 13 (10 points)
Write a unit test for this function:

```javascript
function calculateDiscount(price, discountPercent) {
  if (price < 0 || discountPercent < 0 || discountPercent > 100) {
    throw new Error('Invalid input');
  }
  return price * (1 - discountPercent / 100);
}
```

**Answer:**
```javascript
describe('calculateDiscount', () => {
  it('should calculate discount correctly', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
    expect(calculateDiscount(50, 20)).toBe(40);
  });

  it('should return original price for 0% discount', () => {
    expect(calculateDiscount(100, 0)).toBe(100);
  });

  it('should return 0 for 100% discount', () => {
    expect(calculateDiscount(100, 100)).toBe(0);
  });

  it('should throw error for negative price', () => {
    expect(() => calculateDiscount(-10, 10)).toThrow('Invalid input');
  });

  it('should throw error for negative discount', () => {
    expect(() => calculateDiscount(100, -5)).toThrow('Invalid input');
  });

  it('should throw error for discount > 100', () => {
    expect(() => calculateDiscount(100, 150)).toThrow('Invalid input');
  });

  it('should handle edge case: zero price', () => {
    expect(calculateDiscount(0, 50)).toBe(0);
  });
});
```

## Part 3: Practical Exercise (40 points)

### Task: Build a Testing Pipeline

Create a complete testing setup for this API endpoint:

```javascript
// POST /api/users
// Creates a new user with email validation

router.post('/users', async (req, res) => {
  const { email, name, age } = req.body;

  // Validate email
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // Validate name
  if (!name || name.length < 2) {
    return res.status(400).json({ error: 'Name too short' });
  }

  // Validate age
  if (age < 18 || age > 120) {
    return res.status(400).json({ error: 'Invalid age' });
  }

  const user = await User.create({ email, name, age });
  res.status(201).json(user);
});
```

**Required:**

1. **Unit Tests** (10 points) - Test validation functions
2. **Integration Tests** (10 points) - Test API endpoint
3. **E2E Test** (10 points) - Test full user creation flow
4. **GitHub Actions Workflow** (10 points) - Automate testing

**Grading Criteria:**
- Tests cover all edge cases
- Tests are independent and isolated
- Clear, descriptive test names
- Proper use of AAA pattern
- CI/CD properly configured

## Answer Key

### Part 1: Multiple Choice
1. B (60% Unit, 30% Integration, 10% E2E)
2. B (Branch coverage)
3. B (Verify tests catch actual bugs)
4. C (Act)
5. C (Playwright)
6. A (Sometimes passes, sometimes fails)
7. C (80%)
8. B (Integration tests)
9. B (Continuous Integration / Continuous Deployment)
10. C (Does NOT eliminate manual testing)

**Score:** 30 points total

### Part 2: Code Analysis
11. Identified 4-5 problems (10 points)
12. Proper test structure with AAA pattern (10 points)
13. Comprehensive test suite with edge cases (10 points)

**Score:** 30 points total

### Part 3: Practical Exercise
- Complete testing pipeline with all components
- Proper test organization
- Working CI/CD configuration
- Edge cases covered

**Score:** 40 points total

## Passing Score

**70/100** - Demonstrates solid understanding of QA automation
**85/100** - Shows advanced testing proficiency
**95/100** - Mastery level, ready for production work

## Next Steps

Based on your score:

- **< 70**: Review testing concepts and practice more
- **70-84**: Good foundation, focus on advanced patterns
- **85-94**: Excellent, explore mutation testing and performance
- **95+**: Expert level, mentor others and contribute to testing tools

## Navigation
- Previous: [Project](04_project.md)
- Next: [Resources](06_resources.md)
- [Back to Module Overview](README.md)
