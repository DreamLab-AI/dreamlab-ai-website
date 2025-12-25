# Resources: QA Automation Tools & Learning

## Testing Frameworks

### JavaScript/TypeScript

**Vitest** - https://vitest.dev
- Lightning-fast unit testing
- Vite-native with HMR support
- Compatible with Jest API
- Built-in TypeScript support

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
```

**Jest** - https://jestjs.io
- Most popular JavaScript testing framework
- Snapshot testing
- Code coverage built-in
- Extensive ecosystem

```bash
npm install -D jest @types/jest
```

**Playwright** - https://playwright.dev
- Modern E2E testing
- Cross-browser support
- Auto-wait capabilities
- Powerful debugging tools

```bash
npm install -D @playwright/test
npx playwright install
```

**Cypress** - https://www.cypress.io
- Developer-friendly E2E testing
- Time-travel debugging
- Real-time reloads
- Network stubbing

```bash
npm install -D cypress
```

### Python

**pytest** - https://docs.pytest.org
- Simple and scalable testing
- Fixtures and parametrization
- Plugin ecosystem
- Industry standard

```bash
pip install pytest pytest-cov pytest-asyncio
```

**Unittest** - https://docs.python.org/3/library/unittest.html
- Built-in Python testing framework
- xUnit-style testing
- No external dependencies

## Quality Tools

### Code Coverage

**Codecov** - https://codecov.io
- Coverage reporting and tracking
- GitHub integration
- Pull request comments
- Trend analysis

**Istanbul/nyc** - https://istanbul.js.org
- JavaScript code coverage
- Multiple reporters
- Source map support

```bash
npm install -D nyc
```

### Mutation Testing

**Stryker** - https://stryker-mutator.io
- JavaScript/TypeScript mutation testing
- Multiple test runner support
- Incremental testing

```bash
npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner
```

**mutmut** (Python) - https://mutmut.readthedocs.io
```bash
pip install mutmut
```

### Linting & Formatting

**ESLint** - https://eslint.org
```bash
npm install -D eslint
```

**Prettier** - https://prettier.io
```bash
npm install -D prettier
```

**Ruff** (Python) - https://docs.astral.sh/ruff
```bash
pip install ruff
```

## CI/CD Platforms

### GitHub Actions
- Free for public repos
- Native GitHub integration
- Matrix builds
- Artifact storage

**Example Workflow**: `.github/workflows/test.yml`

### GitLab CI
- Built-in to GitLab
- Docker-first approach
- Auto DevOps

### CircleCI
- Fast builds
- Docker layer caching
- Orbs for reusability

## Visual Regression Testing

**Percy** - https://percy.io
```bash
npm install -D @percy/cli @percy/playwright
```

**Chromatic** - https://www.chromatic.com
- Storybook integration
- UI Review workflows

**BackstopJS** - https://github.com/garris/BackstopJS
- Open source
- Headless browser testing

## Performance Testing

**Lighthouse CI** - https://github.com/GoogleChrome/lighthouse-ci
```bash
npm install -D @lhci/cli
```

**k6** - https://k6.io
- Load testing
- Scriptable in JavaScript
- Beautiful reports

**Artillery** - https://www.artillery.io
- Modern load testing
- Serverless support

## Security Scanning

**Snyk** - https://snyk.io
- Dependency vulnerability scanning
- License compliance
- Container scanning

**npm audit** - Built-in
```bash
npm audit --audit-level=moderate
```

**Trivy** - https://trivy.dev
- Container scanning
- IaC scanning
- SBOM generation

## Testing Utilities

**Supertest** - API testing
```bash
npm install -D supertest
```

**MSW** - Mock Service Worker
```bash
npm install -D msw
```

**Faker.js** - Test data generation
```bash
npm install -D @faker-js/faker
```

**Testing Library** - User-centric testing
```bash
npm install -D @testing-library/react @testing-library/jest-dom
```

## Learning Resources

### Documentation
- [Vitest Guide](https://vitest.dev/guide/)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [pytest Documentation](https://docs.pytest.org/en/stable/)

### Books
- "Test Driven Development: By Example" - Kent Beck
- "The Art of Unit Testing" - Roy Osherove
- "Growing Object-Oriented Software, Guided by Tests" - Steve Freeman
- "Working Effectively with Legacy Code" - Michael Feathers

### Courses
- [Testing JavaScript](https://testingjavascript.com/) - Kent C. Dodds
- [Playwright with TypeScript](https://playwright.dev/docs/test-typescript)
- [TDD Course](https://www.udemy.com/topic/test-driven-development/)

### Blogs & Articles
- [Martin Fowler - Testing](https://martinfowler.com/tags/testing.html)
- [Kent C. Dodds Blog](https://kentcdodds.com/blog)
- [Playwright Blog](https://playwright.dev/community/ambassador-program)

## GitHub Actions Marketplace

**Testing Actions**:
- [actions/checkout@v4](https://github.com/actions/checkout)
- [actions/setup-node@v4](https://github.com/actions/setup-node)
- [codecov/codecov-action@v3](https://github.com/codecov/codecov-action)
- [cypress-io/github-action](https://github.com/cypress-io/github-action)

## Test Data & Mocking

**Faker.js**
```javascript
import { faker } from '@faker-js/faker';

const user = {
  name: faker.person.fullName(),
  email: faker.internet.email(),
  avatar: faker.image.avatar()
};
```

**MSW (Mock Service Worker)**
```javascript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ username: 'admin' }));
  })
);
```

## Debugging Tools

**Playwright Inspector**
```bash
npx playwright test --debug
```

**Chrome DevTools**
- Network tab for API calls
- Console for debugging
- Coverage tool

**VS Code Extensions**
- Vitest
- Playwright Test for VS Code
- Jest Runner
- Code Coverage

## Best Practices Checklists

### Test Writing Checklist
- [ ] Descriptive test names
- [ ] AAA pattern (Arrange, Act, Assert)
- [ ] Tests are independent
- [ ] No shared state between tests
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Fast execution

### CI/CD Checklist
- [ ] Tests run on every PR
- [ ] Code coverage enforced
- [ ] Security scanning enabled
- [ ] Linting required
- [ ] Type checking (if TypeScript)
- [ ] Build verification
- [ ] Deployment automation

### Code Review Checklist
- [ ] New code has tests
- [ ] Tests are meaningful
- [ ] Coverage threshold met
- [ ] No flaky tests
- [ ] Performance acceptable
- [ ] Security considerations

## Community & Support

**Forums & Communities**:
- [Stack Overflow - Testing](https://stackoverflow.com/questions/tagged/testing)
- [Playwright Discord](https://aka.ms/playwright/discord)
- [Testing Library Discord](https://discord.gg/testing-library)
- [Reddit r/softwaretesting](https://reddit.com/r/softwaretesting)

**Conferences**:
- TestJS Summit
- SeleniumConf
- Automation Guild

## Quick Reference

### Common Commands

**Vitest**:
```bash
vitest                    # Watch mode
vitest run                # Run once
vitest --coverage         # With coverage
vitest --ui               # UI mode
```

**Playwright**:
```bash
npx playwright test                  # Run all tests
npx playwright test --ui             # UI mode
npx playwright test --debug          # Debug mode
npx playwright show-report           # View report
npx playwright codegen               # Generate tests
```

**Jest**:
```bash
jest                      # Run all
jest --watch              # Watch mode
jest --coverage           # Coverage
jest --updateSnapshot     # Update snapshots
```

### Coverage Thresholds

**Good Starting Points**:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

**Production Standards**:
- Statements: 90%+
- Branches: 85%+
- Functions: 90%+
- Lines: 90%+

## Navigation
- Previous: [Assessment](05_assessment.md)
- [Back to Module Overview](README.md)
