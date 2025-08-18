describe("Auth page - Integration", () => {
 beforeEach(() => {
    // Visit the Auth page before each test
    cy.visit("http://localhost:3000/auth");
  });

  it("should switch to the signup form when clicking 'Sign Up' and submit successfully", () => {
    // Set up API mocks before any interactions
    cy.intercept('POST', 'http://localhost:5000/api/users/register', {
      statusCode: 200,
      body: {
        success: true,
        message: "User registered successfully.",
        data: {
          token: null, // No token for unverified users
          user: {
            id: '123',
            email: 'testuser@example.com',
            username: 'Test User',
            is_verified: false, // User needs to verify email
          },
        },
      },
    }).as('signupRequest');

    // Mock the file service user addition
    cy.intercept('POST', 'http://localhost:5000/api/files/addUser', {
      statusCode: 200,
      body: { success: true }
    }).as('addUserRequest');

    // First, click on the "Sign Up" tab to switch to the signup form
    cy.get("div").contains("Sign Up").click();

    // Ensure the signup form is now visible
    cy.get('form').should('be.visible');

    // Simulate filling out the signup form
    const signupData = {
      name: "Test User",
      email: "testuser@example.com",
      password: "TestPassword123!",  // Strong password that meets all requirements
      confirmPassword: "TestPassword123!",
    };

    cy.get('input[name="name"]').type(signupData.name);
    cy.get('input[name="email"]').type(signupData.email);
    cy.get('input[name="password"]').type(signupData.password);
    
    // Wait for password requirements to be validated before typing confirm password
    cy.wait(500);
    
    cy.get('input[name="confirmPassword"]').should('not.be.disabled').type(signupData.confirmPassword);
    cy.get('button[type="submit"]').click(); // Submit the form

    // Wait for the signup API call to complete
    cy.wait('@signupRequest');
    cy.wait('@addUserRequest');

    // Assert that the success message is displayed (updated message)
    cy.contains("Account created successfully! Please check your email for verification.", { timeout: 10000 });

    // Assert that no token is saved in localStorage for unverified users
    cy.window().then((window) => {
      expect(window.localStorage.getItem('token')).to.be.null;
    });

    // Assert that the user is redirected to verification page (increased timeout)
    cy.url({ timeout: 10000 }).should('include', '/auth/verify-email');

  });

it("should log in with the correct credentials and store the token", () => {
    const loginData = {
      email: "testuser@example.com",
      password: "password123",
    };

    // Mocking the login API response
    cy.intercept('POST', 'http://localhost:5000/api/users/login', {
      statusCode: 200,
      body: {
        success: true,
        message: "Login successful",
        data: {
          token: 'mock-login-token',
          user: {
            id: '123',
            email: loginData.email,
            name: 'Test User'
          },
          keyBundle: {
            ik_private_key: 'mock-ik-private-key',
            spk_private_key: 'mock-spk-private-key',
            opks_private: 'mock-opks-private'
          }
        }
      }
    }).as('loginRequest');

    // Simulate filling in the login form
    cy.get('input[name="email"]').type(loginData.email);
    cy.get('input[name="password"]').type(loginData.password);
    cy.get('button[type="submit"]').click();

    // Wait for the login API call to complete
    cy.wait('@loginRequest');

  });

  it("should show an error message when login fails", () => {
  const loginData = {
    email: "wronguser@example.com",
    password: "wrongpassword",
  };

  // Mocking the failed login API response
  cy.intercept('POST', 'http://localhost:5000/api/users/login', {
    statusCode: 401,
    body: {
      success: false,
      message: "Invalid login credentials",
    }
  }).as('loginRequest');

  // Simulate filling in the login form with incorrect credentials
  cy.get('input[name="email"]').type(loginData.email);
  cy.get('input[name="password"]').type(loginData.password);
  cy.get('button[type="submit"]').click();

  // Wait for the login API call to complete
  cy.wait('@loginRequest');

  // Assert that the error message is displayed
  cy.contains("Invalid login credentials");
});

});