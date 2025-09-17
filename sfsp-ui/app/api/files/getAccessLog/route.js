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
    // Safe JSON parsing with validation
    let body = {};
    
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');
    
    // Check if there's actually content to parse
    if (contentType?.includes('application/json') && contentLength !== '0') {
      try {
        const textBody = await withTimeout(request.text(), 5000);
        
        if (textBody.trim()) {
          body = JSON.parse(textBody);
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        return respond(400, {
          success: false,
          message: "Invalid JSON in request body",
          error: "INVALID_JSON"
        });
      }
    }
    
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return respond(401, {
        success: false,
        message: "Authentication required"
      });
    }

    // Token verification
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
      console.warn("Token verification failed");
      return respond(401, {
        valid: false,
        message: "Invalid or expired token"
      });
    }

    // Make the API call
    const filesRes = await withTimeout(
      fetch("http://localhost:5000/api/files/getAccessLog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body), // This is now safe
      }),
      15000
    );

    if (!filesRes.ok) {
      let errorData = {
        success: false,
        message: "Backend service error"
      };

      try {
        const errorText = await withTimeout(filesRes.text(), 5000);
        if (errorText.trim()) {
          errorData = JSON.parse(errorText);
        }
      } catch (parseError) {
        console.warn("Failed to parse backend error response:", parseError);
      }

      return respond(filesRes.status, errorData);
    }

    // Parse success response safely
    const resultText = await withTimeout(filesRes.text(), 5000);
    let result = { success: true };
    
    if (resultText.trim()) {
      try {
        result = JSON.parse(resultText);
      } catch (parseError) {
        console.warn("Failed to parse success response:", parseError);
        result = { success: true, message: "Response received but not parseable" };
      }
    }
    
    return respond(200, result);

  } catch (error) {
    console.error("getAccessLog API error:", error);
    
    if (error.message.includes('timeout')) {
      return respond(408, {
        success: false,
        message: "Request timed out",
        error: "REQUEST_TIMEOUT"
      });
    }
    
    return respond(500, {
      success: false,
      message: "Internal server error",
      error: "INTERNAL_ERROR"
    });
  }
}