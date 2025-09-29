import React from "react";
import AuthPage from "../../app/auth/page";
import "../../app/globals.css";
import { AppRouterMockProvider } from "../support/AppRouterMockProvider";

describe("AuthPage Component", () => {
  beforeEach(() => {
    cy.mount(
      <AppRouterMockProvider>
        <AuthPage />
      </AppRouterMockProvider>
    );
    cy.window().then((win) => {
      cy.stub(win, "fetch").as("fetchStub");
    });
  });

  /* it("renders login form with all required fields", () => {
    cy.contains("Log In").should("be.visible");
    cy.get('input[name="email"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.contains("Log In").should("be.visible");
    cy.contains("Sign Up").should("be.visible");
    cy.get('a[href="/requestReset"]').should("be.visible");
  });
 */
  // it("displays validation error for empty fields", () => {
  //   cy.get("form").first().submit();
  //   cy.contains("Invalid login credentials").should("exist");
  // });

  // it("shows loading state during submission", () => {
  //   cy.get("@fetchStub").invoke("callsFake", () =>
  //     new Promise((resolve) =>
  //       setTimeout(() => {
  //         resolve(
  //           new Response(
  //             JSON.stringify({ success: true, data: { token: "Bearer testtoken" } }),
  //             {
  //               status: 200,
  //               headers: { "Content-Type": "application/json" },
  //             }
  //           )
  //         );
  //       }, 500)
  //     )
  //   );

  //   cy.get('input[name="email"]').type("john@example.com");
  //   cy.get('input[name="password"]').type("password123");
  //   cy.get("form").first().submit();

  //   cy.contains("Signing in...").should("be.visible");
  //   cy.get('input[name="email"]').should("be.disabled");
  //   cy.get('input[name="password"]').should("be.disabled");
  // });

  // it("handles successful login", () => {
  //   const token = "Bearer testtoken123";

  //   cy.get("@fetchStub").invoke("resolves", {
  //     json: () =>
  //       Promise.resolve({
  //         success: true,
  //         data: { token },
  //       }),
  //     ok: true,
  //     status: 200,
  //     headers: { get: () => "application/json" },
  //   });

  //   cy.get('input[name="email"]').type("john@example.com");
  //   cy.get('input[name="password"]').type("password123");
  //   cy.get("form").first().submit();

  //   cy.contains("Login successful!").should("be.visible");
  //   cy.window().its("localStorage.token").should("eq", "testtoken123");
  //   // If you stubbed router.push, you can check:
  //   // cy.get("@routerPush").should("have.been.calledWith", "/dashboard");
  // });

  /* it("handles login failure", () => {
    cy.get("@fetchStub").invoke("resolves", {
      json: () =>
        Promise.resolve({
          success: false,
          message: "Invalid login credentials",
        }),
      ok: false,
      status: 401,
      headers: { get: () => "application/json" },
    });

    cy.get('input[name="email"]').type("wrong@example.com");
    cy.get('input[name="password"]').type("wrongpassword");
    cy.get("form").first().submit();

    cy.contains("Invalid login credentials").should("be.visible");
  }); */

  it("handles network error", () => {
    cy.get("@fetchStub").invoke("rejects", new Error("Network error"));

    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get("form").first().submit();

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

  /* it("makes correct API call with form data", () => {
    cy.get("@fetchStub").invoke("resolves", {
      json: () =>
        Promise.resolve({
          success: true,
          data: { token: "Bearer abc123" },
        }),
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
    });

    cy.get('input[name="email"]').type("john@example.com");
    cy.get('input[name="password"]').type("password123");
    cy.get("form").first().submit();

    cy.get("@fetchStub").should("have.been.calledWith", "http://localhost:5000/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "john@example.com",
        password: "password123",
      }),
    });
  }); */

  // it("supports dark mode styling", () => {
  //   cy.mount(
  //     <AppRouterMockProvider>
  //       <div className="dark">
  //         <AuthPage />
  //       </div>
  //     </AppRouterMockProvider>
  //   );

  //   cy.get(".dark\\:bg-gray-900").should("exist");
  //   cy.get(".dark\\:bg-gray-300").should("exist");
  //   cy.get(".dark\\:text-white").should("exist");
  // });
});