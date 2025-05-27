import React from "react";
import SignupPage from "../../app/signup/page";
import "../../app/globals.css";
import mountWithAppRouter from "../support/mountWithAppRouter";

describe("Signup Page Component", () => {
  beforeEach(() => {
    mountWithAppRouter(<SignupPage />);

    cy.window().then((win) => {
      cy.stub(win, "fetch").as("fetchStub");
    });
  });

  it("renders signup form with all required fields", () => {
    mountWithAppRouter(<SignupPage />);

    cy.contains("Sign Up").should("be.visible");

    cy.get('input[name="name"]').should("be.visible");
    cy.get('input[name="email"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.get('input[name="confirmPassword"]').should("be.visible");

    cy.contains("Create Account").should("be.visible");

    cy.contains("Already have an account?").should("be.visible");
    cy.get('a[href="/login"]').should("be.visible");
  });

  it("displays validation error for empty fields", () => {
    mountWithAppRouter(<SignupPage />);

    cy.get("form").submit();

    cy.contains("All fields are required.").should("be.visible");
  });

  it("validates email format", () => {
    mountWithAppRouter(<SignupPage />);

    cy.get('input[name="name"]').type("John Doe");
    cy.get('input[name="email"]').type("invalid-email");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("password123");

    cy.get("form").submit();

    cy.contains("Please enter a valid email address.").should("be.visible");
  });

  it("validates password length", () => {
    mountWithAppRouter(<SignupPage />);

    cy.get('input[name="name"]').type("John Doe");
    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("123");
    cy.get('input[name="confirmPassword"]').type("123");

    cy.get("form").submit();

    cy.contains("Password must be at least 6 characters long.").should(
      "be.visible"
    );
  });

  it("validates password confirmation match", () => {
    mountWithAppRouter(<SignupPage />);

    cy.get('input[name="name"]').type("John Doe");
    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("differentpassword");

    cy.get("form").submit();

    cy.contains("Passwords don't match.").should("be.visible");
  });

  it("shows loading state during form submission", function () {
    mountWithAppRouter(<SignupPage />);

    this.fetchStub.callsFake(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve(
              new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              })
            );
          }, 500)
        )
    );

    cy.get('input[name="name"]').type("John Doe");
    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("password123");

    cy.get("form").submit();

    cy.contains("Signing Up...").should("be.visible");
    cy.get(".animate-spin").should("be.visible");

    cy.get('input[name="name"]').should("be.disabled");
    cy.get('input[name="email"]').should("be.disabled");
  });

  describe("Signup Page Component", () => {
    beforeEach(function () {
      cy.window().then((win) => {
        // Prevent double-stubbing
        if (!win.fetch.restore) {
          cy.stub(win, "fetch").as("fetchStub");
        }
      });
    });

    it("handles successful registration", function () {
      cy.get("@fetchStub").then((stub) => {
        stub.resolves(
          new Response(
            JSON.stringify({
              success: true,
              message: "User registered successfully",
              data: {
                token: "Bearer faketoken123"
              }
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      });

      mountWithAppRouter(<SignupPage />);

      cy.get('input[name="name"]').type("John Doe");
      cy.get('input[name="email"]').type("john@example.com");
      cy.get('input[name="password"]').type("password123");
      cy.get('input[name="confirmPassword"]').type("password123");

      cy.get("form").submit();

      cy.get("@routerPush").should("have.been.calledWith", "/dashboard");
    });
  });

  it("handles registration failure", function () {
    mountWithAppRouter(<SignupPage />);

    this.fetchStub.resolves(
      new Response(
        JSON.stringify({
          success: false,
          message: "Email already exists",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    cy.get('input[name="name"]').type("John Doe");
    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("password123");

    cy.get("form").submit();

    cy.contains("Email already exists").should("be.visible");
  });

  it("handles network error during registration", function () {
    mountWithAppRouter(<SignupPage />);

    this.fetchStub.rejects(new Error("Network error"));

    cy.get('input[name="name"]').type("John Doe");
    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("password123");

    cy.get("form").submit();

    cy.contains("Network error").should("be.visible");
  });

  it("updates form fields correctly", () => {
    mountWithAppRouter(<SignupPage />);

    const testData = {
      name: "Jane Smith",
      email: "jane@example.com",
      password: "securepass123",
      confirmPassword: "securepass123",
    };

    cy.get('input[name="name"]')
      .type(testData.name)
      .should("have.value", testData.name);
    cy.get('input[name="email"]')
      .type(testData.email)
      .should("have.value", testData.email);
    cy.get('input[name="password"]')
      .type(testData.password)
      .should("have.value", testData.password);
    cy.get('input[name="confirmPassword"]')
      .type(testData.confirmPassword)
      .should("have.value", testData.confirmPassword);
  });

  it("makes correct API call with form data", function () {
    mountWithAppRouter(<SignupPage />);

    this.fetchStub.resolves(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    cy.get('input[name="name"]').type("John Doe");
    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get('input[name="confirmPassword"]').type("password123");

    cy.get("form").submit();

    cy.get("@fetchStub").should(
      "have.been.calledWith",
      "http://localhost:5000/api/users/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "John Doe",
          email: "john@example.com",
          password: "password123",
        }),
      }
    );
  });

  it("supports dark mode styling", () => {
    mountWithAppRouter(
      <div className="dark">
        <SignupPage />
      </div>
    );

    cy.get(".dark\\:bg-gray-900").should("exist");
    cy.get(".dark\\:bg-gray-800").should("exist");
    cy.get(".dark\\:text-white").should("exist");
  });
});
