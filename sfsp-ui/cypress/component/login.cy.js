import React from "react";
import LoginPage from "../../app/login/page";
import "../../app/globals.css";
import mountWithAppRouter from "../support/mountWithAppRouter";

describe("Login Page Component", () => {
  beforeEach(() => {
    mountWithAppRouter(<LoginPage />);
    cy.window().then((win) => {
      cy.stub(win, "fetch").as("fetchStub");
    });
  });

  it("renders login form with all required fields", () => {
    cy.contains("Log in to your account").should("be.visible");
    cy.get('input[name="email"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.contains("Sign In").should("be.visible");
    cy.contains("Don’t have an account?").should("be.visible");
    cy.get('a[href="/signup"]').should("be.visible");
  });

  it("displays validation error for empty fields", () => {
    cy.get("form").submit();
    cy.contains("Cannot read properties").should("be.visible");
  });

  it("shows loading state during submission", function () {
    this.fetchStub.callsFake(() =>
      new Promise((resolve) =>
        setTimeout(() => {
          resolve(new Response(JSON.stringify({ success: true, data: { token: "Bearer testtoken" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }));
        }, 500)
      )
    );

    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get("form").submit();

    cy.contains("Signing In...").should("be.visible");
    cy.get(".animate-spin").should("exist");
    cy.get('input[name="email"]').should("be.disabled");
    cy.get('input[name="password"]').should("be.disabled");
  });

  it("handles successful login", function () {
    const token = "Bearer testtoken123";

    this.fetchStub.resolves(
      new Response(JSON.stringify({
        success: true,
        data: { token },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get("form").submit();

    cy.contains("Login successful!").should("be.visible");
    cy.window().its("localStorage.token").should("eq", "testtoken123");

    cy.get("@routerPush").should("have.been.calledWith", "/dashboard");
  });

  it("handles login failure", function () {
    this.fetchStub.resolves(
      new Response(JSON.stringify({
        success: false,
        message: "Invalid login credentials",
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    cy.get('input[name="email"]').type("wrong@example.com");
    cy.get('input[name="password"]').type("wrongpassword");
    cy.get("form").submit();

    cy.contains("Invalid login credentials").should("be.visible");
  });

  it("handles network error", function () {
    this.fetchStub.rejects(new Error("Network error"));

    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get("form").submit();

    cy.contains("Network error").should("be.visible");
  });

  it("updates form fields correctly", () => {
    const testData = {
      email: "jane@example.com",
      password: "securepass123",
    };

    cy.get('input[name="email"]').type(testData.email).should("have.value", testData.email);
    cy.get('input[name="password"]').type(testData.password).should("have.value", testData.password);
  });

  it("makes correct API call with form data", function () {
    this.fetchStub.resolves(
      new Response(JSON.stringify({ success: true, data: { token: "Bearer abc123" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get("form").submit();

    cy.get("@fetchStub").should("have.been.calledWith",
      "http://localhost:5000/api/users/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "john@example.com",
          password: "password123",
        }),
      }
    );
  });

  it("supports dark mode styling", () => {
    mountWithAppRouter(
      <div className="dark">
        <LoginPage />
      </div>
    );

    cy.get(".dark\\:bg-gray-900").should("exist");
    cy.get(".dark\\:bg-gray-800").should("exist");
    cy.get(".dark\\:text-white").should("exist");
  });
});
