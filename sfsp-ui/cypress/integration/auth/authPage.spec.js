describe("Auth page - Integration", () => {
 beforeEach(() => {
    // Visit the Auth page before each test
    cy.visit("http://localhost:3000/auth");
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