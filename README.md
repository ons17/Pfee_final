# Login Test Suite

## Running Tests

Run specific test suites:
```bash
# Authentication tests
python3 -m robot robot-tests/tests/login/login_authentication.robot

# UI tests
python3 -m robot robot-tests/tests/login/login_ui.robot

# Validation tests
python3 -m robot robot-tests/tests/login/login_validation.robot
```

Run tests by tags:
```bash
# Smoke tests
python3 -m robot --include smoke robot-tests/tests/login/

# Critical tests
python3 -m robot --include critical robot-tests/tests/login/

# UI tests
python3 -m robot --include ui robot-tests/tests/login/
```