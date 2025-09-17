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

  const csrfDeny = enforceCsrf(request);
  if (csrfDeny) {
    return csrfDeny;
  }

  try {
    const body = await withTimeout(
      request.json(),
      5000
    );

    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return respond(401, {
        success: false,
        message: "Authentication required"
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
      10000
    );

    if (!verifyResponse.ok) {
      let errorMessage = "Invalid or expired token";
      
      try {
        const verifyError = await withTimeout(
          verifyResponse.text(),
          3000 
        );
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
        message: errorMessage
      });
    }

    const filesRes = await withTimeout(
      fetch("http://localhost:5000/api/files/addAccesslog", {
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
      let errorData = {
        success: false,
        message: "Backend service error"
      };

      try {
        // Parse error response with timeout
        errorData = await withTimeout(
          filesRes.json(),
          5000 // 5 second timeout for error parsing
        );
        console.error("❌ Backend error:", errorData);
      } catch (parseError) {
        console.warn("Failed to parse backend error response:", parseError);
        // Use default error data if parsing fails
      }

      return respond(filesRes.status, errorData);
    }

    // 6. Parse successful response with timeout
    const result = await withTimeout(
      filesRes.json(),
      5000 // 5 second timeout for success response parsing
    );
    
    return respond(200, result);

  } catch (error) {
    console.error("addAccessLog proxy error:", error);
    
    // 7. Enhanced error handling with specific error types
    if (error.message.includes('timeout')) {
      return respond(408, {
        success: false,
        message: "Request timed out - backend service is slow",
        error: "REQUEST_TIMEOUT"
      });
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      return respond(503, {
        success: false,
        message: "Backend service is unavailable",
        error: "SERVICE_UNAVAILABLE"
      });
    }
    
    if (error.name === 'SyntaxError') {
      return respond(400, {
        success: false,
        message: "Invalid request format",
        error: "INVALID_JSON"
      });
    }
    
    // Generic server error
    return respond(500, {
      success: false,
      message: "Internal server error",
      error: "INTERNAL_ERROR"
    });
  }
}