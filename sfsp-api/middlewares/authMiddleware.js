/* global process */
const jwt = require("jsonwebtoken");
const { supabase } = require("../config/database");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "sfsp-api",
    });

    if (!decoded.userId || !decoded.iat || !decoded.exp) {
      return res.status(401).json({
        success: false,
        message: "Token missing required claims.",
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, is_verified")
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      is_verified: user.is_verified,
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication failed: " + error.message,
    });
  }
};

module.exports = authMiddleware;
