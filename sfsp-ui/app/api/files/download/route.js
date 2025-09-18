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

    const filesRes = await withTimeout(fetch("http://localhost:5000/api/files/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }),15000);

    if (!filesRes.ok) {
      const errorData = await filesRes.text();
      return NextResponse.json(
        { success: false, message: errorData },
        { status: filesRes.status }
      );
    }

    const arrayBuffer = await filesRes.arrayBuffer();

    const response = new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    const nonce = filesRes.headers.get("X-Nonce");
    const fileName = filesRes.headers.get("X-File-Name");

    if (nonce) {
      response.headers.set("X-Nonce", nonce);
    }
    if (fileName) {
      response.headers.set("X-File-Name", fileName);
    }

    return response;
  } catch (error) {
    console.error("Files download API error:", error);
    return NextResponse.json(
      { success: false, message: "Service unavailable" },
      { status: 500 }
    );
  }
}
