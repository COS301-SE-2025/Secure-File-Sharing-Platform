const jwt = require("jsonwebtoken");
const { supabase } = require("../config/database");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : req.cookies?.auth_token;

    if (!token) return res.status(401).json({ success:false, message:"Authentication token is required." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from("users").select("*").eq("id", decoded.userId).single();

    if (error || !user) return res.status(401).json({ success:false, message:"Invalid authentication token." });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ success:false, message:"Authentication failed: " + e.message });
  }
};
