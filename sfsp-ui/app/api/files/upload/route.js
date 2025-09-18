import { NextResponse } from "next/server";
import { enforceCsrf } from "../../_utils/csrf";
import {
  enforceSecurity,
  respond,
  withTimeout,
  CONFIG,
} from "../../_utils/proxy";

export async function POST(request) {
  const securityCheck = enforceSecurity(request, {
    useTokenRateLimit: true,
  });

  if (securityCheck) {
    return securityCheck;
  }
  const deny = enforceCsrf(request);
  if (deny) {
    return deny;
  }
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return respond(401, {
        success: false,
        message: "Authentication required",
      });
    }

    const verifyResponse = await withTimeout(
      fetch("http://localhost:5000/api/users/verify-token", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }),
      1000
    );

    if (!verifyResponse.ok) {
      let errorMessage = "Invalid or expired token";

      try {
        const verifyError = await withTimeout(verifyResponse.text(), 3000);
        console.warn("Token verification failed:", verifyError);

        if (verifyResponse.status === 401) {
          errorMessage = "Token has expired";
        } else if (verifyResponse.status === 403) {
          errorMessage = "Token is invalid";
        }
      } catch (parseError) {
        console.warn("Failed to parse verification error:", parseError);
      }

      return respond(401, {
        valid: false,
        message: errorMessage,
      });
    }

    const formData = await withTimeout(request.formData(),5000);
    const backendFormData = new FormData();

    for (const [key, value] of formData.entries()) {
      backendFormData.append(key, value);
    }

    const response = await fetch("http://localhost:5000/api/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, message: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { success: false, message: "Service unavailable" },
      { status: 500 }
    );
  }
}
