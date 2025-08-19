# Integration Tests for SecureShare Platform

This directory contains comprehensive integration tests for the SecureShare file sharing platform.

## Test Categories

### 1. Avatar Display Tests (`avatar/avatarDisplay.spec.js`)
Tests the new intelligent avatar system that handles:
- Google OAuth users with profile pictures
- Regular users with complex usernames (e.g., "S_Daniel" → "SD")
- Fallback initials for various username formats
- Avatar display consistency across all pages

### 2. Dashboard Integration Tests (`dashboard/dashboardIntegration.spec.js`)
Comprehensive dashboard functionality tests:
- Dashboard overview and statistics
- File upload workflows
- Navigation between sections
- Search functionality
- Theme switching
- Error handling and recovery

### 3. Access Logs Integration Tests (`accessLogs/accessLogsIntegration.spec.js`)
Tests for the access logs functionality:
- Loading and displaying access logs
- Avatar display in log entries
- Filtering by action type and date range
- Export functionality (CSV/PDF)
- Error handling for missing user data

### 4. User Profile Integration Tests (`userProfile/userProfileIntegration.spec.js`)
User profile and settings management:
- Profile information display
- Dropdown interactions
- Settings management
- Sidebar behavior (collapse/expand)
- Authentication state handling
- Avatar edge cases

### 5. Complete User Journey Tests (`e2e/completeUserJourney.spec.js`)
End-to-end user flows:
- Registration → Dashboard → File Operations
- Google OAuth user journey
- Error recovery scenarios
- Username edge case handling

## Running the Tests

### Prerequisites
1. Start the development server:
   ```bash
   cd sfsp-ui
   npm run dev
   ```

2. Start the API server:
   ```bash
   cd sfsp-api
   npm start
   ```

3. Ensure database services are running:
   ```bash
   docker compose up -d
   ```

### Running Tests

#### Open Cypress Test Runner (Interactive)
```bash
cd sfsp-ui
npm run cypress
```

#### Run Specific Test Files
```bash
# Avatar display tests
npx cypress run --spec "cypress/integration/avatar/avatarDisplay.spec.js"

# Dashboard tests
npx cypress run --spec "cypress/integration/dashboard/dashboardIntegration.spec.js"

# Access logs tests
npx cypress run --spec "cypress/integration/accessLogs/accessLogsIntegration.spec.js"

# User profile tests
npx cypress run --spec "cypress/integration/userProfile/userProfileIntegration.spec.js"

# Complete user journey
npx cypress run --spec "cypress/integration/e2e/completeUserJourney.spec.js"
```

#### Run All Integration Tests
```bash
npx cypress run --spec "cypress/integration/**/*.spec.js"
```

#### Run Component Tests
```bash
npm run ct
```

## Test Features

### Avatar Logic Testing
These tests specifically validate the new avatar logic:
- **Google OAuth users**: Display actual Google profile pictures
- **Complex usernames**: Handle "S_Daniel" → "SD", "john_doe" → "JD", etc.
- **Edge cases**: Numbers, single words, empty usernames
- **Consistency**: Same logic across sidebar, dashboard, and access logs

### API Mocking
All tests use Cypress intercepts to mock API responses:
- User authentication and profile data
- File metadata and operations
- Access logs and user information
- Error scenarios and edge cases

### Real User Flows
Tests simulate actual user interactions:
- Form submissions and validations
- Navigation and routing
- File upload workflows
- Settings changes and preferences
- Authentication state management

## Test Data Patterns

### User Profiles
```javascript
// Regular user with complex username
{
  id: 'user123',
  username: 'S_Daniel',
  email: 's.daniel@example.com',
  avatar_url: null
}

// Google OAuth user with avatar
{
  id: 'google-user',
  username: 'John Doe',
  email: 'john.doe@gmail.com',
  avatar_url: 'https://lh3.googleusercontent.com/avatar.jpg'
}
```

### File Data
```javascript
{
  fileId: 'file123',
  fileName: 'document.pdf',
  mimeType: 'application/pdf',
  fileSize: 1024,
  uploadTime: '2024-01-01T00:00:00Z',
  tags: 'important,work'
}
```

### Access Logs
```javascript
{
  file_id: 'file123',
  user_id: 'user123',
  action: 'Downloaded',
  timestamp: '2024-01-01T00:00:00Z'
}
```

## Configuration

### Cypress Configuration
The tests are configured to work with:
- Base URL: `http://localhost:3000` (Next.js dev server)
- API URL: `http://localhost:5000` (Express API server)
- Viewport: 1280x720 (desktop testing)

### Environment Variables
Required for OAuth testing:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Best Practices

### Test Structure
1. **Arrange**: Set up mocks and authentication
2. **Act**: Perform user interactions
3. **Assert**: Verify expected outcomes

### Mocking Strategy
- Mock all external API calls
- Use realistic test data
- Handle both success and error scenarios
- Maintain consistency across test files

### Assertions
- Test UI elements and user interactions
- Verify API calls with correct data
- Check localStorage/sessionStorage state
- Validate navigation and routing

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout values for slow API responses
2. **Element not found**: Ensure proper data-testid attributes
3. **Mock not working**: Check API URL patterns and response format
4. **Authentication errors**: Verify token mocking in beforeEach hooks

### Debug Mode
Run tests in headed mode to see browser interactions:
```bash
npx cypress run --headed --spec "path/to/test.spec.js"
```

## Coverage

These integration tests cover:
- ✅ User authentication flows
- ✅ Avatar display logic (new feature)
- ✅ Dashboard functionality
- ✅ File operations
- ✅ Access logs and monitoring
- ✅ Settings and preferences
- ✅ Error handling and recovery
- ✅ Responsive design elements
- ✅ Theme switching
- ✅ Navigation and routing
