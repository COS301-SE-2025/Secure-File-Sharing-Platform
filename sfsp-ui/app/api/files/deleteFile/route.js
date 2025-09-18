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
    const body = await withTimeout(request.json(), 5000);
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

    const filesRes = await WithTimeout(
      fetch("http://localhost:5000/api/files/deleteFile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }),
      15000
    );

    if (!filesRes.ok) {
      const errorData = await filesRes.json();
      console.log("❌ Backend error:", errorData);
      return NextResponse.json(errorData, { status: filesRes.status });
    }

    const contentType = filesRes.headers.get("content-type") || "";

    let result;
    if (contentType.includes("application/json")) {
      result = await filesRes.json();
    } else {
      const text = await filesRes.text();
      result = { error: "Upstream error", message: text };
    }

    return NextResponse.json(result, { status: filesRes.status });
  } catch (error) {
    console.error("deleteFile proxy error metadata API error:", error);
    return NextResponse.json(
      { success: false, message: "Service unavailable" },
      { status: 500 }
    );
  }
}
