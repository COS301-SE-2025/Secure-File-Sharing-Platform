const jwt = require("jsonwebtoken");
const axios = require("axios");
const { supabase } = require("../config/database");
const userService = require("../services/userService");
const VaultController = require("./vaultController");
const MnemonicCrypto = require("../utils/mnemonicCrypto");

class UserController {
  async register(req, res) {
    console.log("I can get here");
    try {
      const { username, email, password } = req.body;
      const {
        ik_public,
        spk_public,
        opks_public,
        nonce,
        signedPrekeySignature,
        salt,
      } = req.body;
      const { ik_private_key, spk_private_key, opks_private } = req.body;

      if (
        !username ||
        !email ||
        !password ||
        !ik_private_key ||
        !spk_private_key ||
        !opks_private ||
        !ik_public ||
        !spk_public ||
        !opks_public ||
        !nonce ||
        !signedPrekeySignature ||
        !salt
      ) {
        return res.status(400).json({
          success: false,
          message: "Username, email, and password are required.",
        });
      }

      const result = await userService.register({
        username,
        email,
        password,
        ik_public,
        spk_public,
        opks_public,
        nonce,
        signedPrekeySignature,
        salt,
      });
      if (result && result.user && result.user.id) {
        const vaultres = await VaultController.storeKeyBundle({
          encrypted_id: result.user.id,
          ik_private_key,
          spk_private_key,
          opks_private,
        });
        if (!vaultres || vaultres.error) {
          console.log("Inside the if statement vaultres");
          return res.status(500).json({
            success: false,
            message: vaultres.error || "Failed to store private keys in vault.",
          });
        }

        try {
          await userService.sendVerificationCode(
            result.user.id,
            result.user.email,
            result.user.username || "User"
          );
          console.log(
            "Verification email sent to new user:",
            result.user.email
          );
        } catch (emailError) {
          console.error("Failed to send verification email to new user:", emailError);
        }

        // Mnemonic email is already sent by userService.register
        // No need to send it again here
      }
      console.log("The is before the 201");
      return res.status(201).json({
        success: true,
        message: "User registered successfully.",
        data: result,
      });
    } catch (error) {
      console.error("Error registering user:", error);

      // Return specific error messages for known issues
      if (error.message.includes("User already exists")) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email address already exists. Please use a different email or try logging in.",
        });
      }

      if (error.message.includes("Failed to create user")) {
        return res.status(400).json({
          success: false,
          message:
            "Failed to create account. Please check your information and try again.",
        });
      }

      if (error.message.includes("Failed to store private keys")) {
        return res.status(500).json({
          success: false,
          message:
            "Account created but failed to secure your keys. Please try registering again.",
        });
      }

      // Generic fallback for unexpected errors
      return res.status(500).json({
        success: false,
        message:
          "An unexpected error occurred while creating your account. Please try again.",
      });
    }
  }

  async getUserIdFromEmail(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing or invalid.",
      });
    }
    try {
      const { email } = req.params;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "No email provided",
        });
      }

      const response = await userService.getUserIdFromEmail(email);
      if (!response) {
        return res.status(404).json({
          success: false,
          message: "User Id not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("Error fetching user Id", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async getUserInfoFromID(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing or invalid.",
      });
    }
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "No userID provided",
        });
      }

      const userInfo = await userService.getUserInfoFromID(userId);

      if (!userInfo) {
        return res.status(404).json({
          success: false,
          message: `User with userId ${userId} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: userInfo,
      });
    } catch (error) {
      console.error("Error fetching user info:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getPublicKeys(req, res) {
    try {
      const { userId } = req.params;
      console.log("User Id is:", userId);
      if (!userId) {
        console.log("No user id provided");
        return res.status(400).json({
          success: false,
          message: "No user ID provided",
        });
      }

      console.log("Going to getPublicKeys with userId");
      const response = await userService.getPublicKeys(userId);
      if (!response) {
        return res.status(404).json({
          success: false,
          message: "User not found or missing public keys",
        });
      }

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("Error fetching the public keys:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required.",
        });
      }

      const result = await userService.login({ email, password });

      if (result && result.user && result.user.id) {
        const keyBundle = await VaultController.retrieveKeyBundle(
          result.user.id
        );
        result.keyBundle = keyBundle;

        try {
          console.log('🔄 STARTING SESSION CREATION PROCESS FOR USER:', result.user.id);
          
          const userAgent = req.headers['user-agent'] || '';
          const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'Unknown';
          const deviceFingerprint = userService.generateDeviceFingerprint(userAgent, ipAddress);

          const browserInfo = userService.parseUserAgent(userAgent, req.headers);
          console.log('Detected browser and OS info:', browserInfo);

          const location = userService.getLocationFromIP(ipAddress);
          console.log('Detected location:', location);

          const deviceInfo = {
            deviceFingerprint,
            userAgent,
            ipAddress,
            location,
            headers: req.headers,
            ...browserInfo
          };
          
          console.log('Final device info:', deviceInfo);

          const sessionResult = await userService.createOrUpdateUserSession(result.user.id, deviceInfo);
          
          console.log('Session creation result:', {
            sessionId: sessionResult.session?.id,
            isNewDevice: sessionResult.isNewDevice,
            browser: sessionResult.session?.browser_name,
            ip: sessionResult.session?.ip_address,
            location: sessionResult.session?.location,
            lastLogin: sessionResult.session?.last_login_at
          });

          if (sessionResult.isNewDevice) {
            const notificationService = require('../services/notificationService');
            await notificationService.sendNewBrowserSignInAlert(
              result.user.id,
              browserInfo,
              location,
              ipAddress
            );
          }
        } catch (sessionError) {
          console.error('SESSION CREATION ERROR:', sessionError);
          console.error('Session error details:', {
            message: sessionError.message,
            stack: sessionError.stack,
            deviceInfo: deviceInfo
          });
        }
      }

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getProfile(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization token missing or invalid.",
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = await userService.verifyToken(token);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token.",
        });
      }
      const userId = decoded.userId;

      const profile = await userService.getProfile(userId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "User profile not found.",
        });
      }

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization token missing or invalid.",
        });
      }
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
      }

      const token = await userService.refreshToken(userId);
      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully.",
        token,
      });
    } catch (error) {
      console.error("Error refreshing token:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async deleteProfile(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required.",
        });
      }

      const result = await userService.deleteProfile(email);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: "User profile not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "User profile deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting user profile:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: "Username is required.",
        });
      }

      const updatedUser = await userService.updateProfile(userId, { username });

      res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile.",
      });
    }
  }

  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization token missing or invalid.",
        });
      }
      const token = authHeader.split(" ")[1];
      const result = await userService.logout(token);
      if (!result) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token.",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Logout successful.",
      });
    } catch (error) {
      console.error("Error during logout:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async verifyPassword(req, res) {
    try {
      const { currentPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required",
        });
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("password")
        .eq("id", userId)
        .single();

      if (error || !user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isValid = await MnemonicCrypto.validatePassword(currentPassword, user.password);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      res.json({
        success: true,
        message: "Password verified successfully",
      });
    } catch (error) {
      console.error("Error verifying password:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async sendResetPIN(req, res) {
    try {
      const userId = req.user.id;

      const result = await userService.sendPasswordResetPIN(userId);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error sending reset PIN:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send reset PIN",
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { pin, newPassword } = req.body;
      const userId = req.user.id;

      if (!pin || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "PIN and new password are required",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long",
        });
      }

      const result = await userService.verifyPINAndChangePassword(
        userId,
        pin,
        newPassword
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to change password",
      });
    }
  }

  async getUserToken(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

      if (error || !user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const token = userService.generateToken(userId, user.email);

      return res.status(200).json({
        success: true,
        token,
      });
    } catch (error) {
      console.error("Error generating token:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async getUserInfoFromToken(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization token missing or invalid.",
        });
      }

      const token = authHeader.split(" ")[1];
      const result = userService.getDecodedToken(token);

      if (!result.valid) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token.",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          userId: result.decoded.userId,
          email: result.decoded.email,
        },
      });
    } catch (error) {
      console.error("Error decoding token:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async updateNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      const notificationSettings = req.body;

      if (!notificationSettings) {
        return res
          .status(400)
          .json({ error: "Notification settings are required" });
      }

      const updatedSettings = await userService.updateNotificationSettings(
        userId,
        notificationSettings
      );

      return res.status(200).json({
        message: "Notification settings updated successfully",
        data: updatedSettings,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      const { notificationSettings, email, username } =
        await userService.getNotificationSettings(userId);
      return res
        .status(200)
        .json({ data: { notificationSettings, email, username } });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async updateAvatarUrl(req, res) {
    try {
      console.log("Received updateAvatarUrl request:", {
        userId: req.user.id,
        avatar_url: req.body.avatar_url,
      });
      const userId = req.user.id;
      const { avatar_url } = req.body;

      if (!avatar_url && avatar_url !== null) {
        return res.status(400).json({
          success: false,
          message: "Avatar URL required (or null to remove)",
        });
      }

      const updatedUrl = await userService.updateAvatarUrl(userId, avatar_url);
      res.status(200).json({ success: true, data: { avatar_url: updatedUrl } });
    } catch (error) {
      console.error("Error in updateAvatarUrl:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async googleAuth(req, res) {
    try {
      const { email, name, picture, google_id, keyBundle } = req.body;

      if (!email || !google_id) {
        return res.status(400).json({
          success: false,
          message: "Email and Google ID are required.",
        });
      }
      
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'Unknown';
      const deviceFingerprint = userService.generateDeviceFingerprint(userAgent, ipAddress);
      const browserInfo = userService.parseUserAgent(userAgent, req.headers);
      
      const deviceInfo = {
        deviceFingerprint,
        userAgent,
        ipAddress,
        ...browserInfo
      };
      
      console.log('Google auth device info:', deviceInfo);

      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      let user;
      let isNewUser = false;

      if (checkError && checkError.code !== "PGRST116") {
        throw new Error("Database error: " + checkError.message);
      }

      if (existingUser) {
        if (!existingUser.google_id) {
          const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update({
              google_id: google_id,
              avatar_url: picture || existingUser.avatar_url,
              is_verified: true
            })
            .eq("id", existingUser.id)
            .select()
            .single();

          if (updateError) {
            throw new Error(
              "Failed to update user with Google ID: " + updateError.message
            );
          }
          user = updatedUser;
        } else {
          user = existingUser;
          
          if (!existingUser.is_verified) {
            console.log("Existing Google user is not verified, keeping unverified status for 2FA");
          }
        }

        try {
          const postgresRes = await axios.post(
            `${
              process.env.FILE_SERVICE_URL || "http://localhost:8081"
            }/addUser`,
            { userId: user.id },
            { headers: { "Content-Type": "application/json" } }
          );
          console.log("User successfully ensured in PostgreSQL database");
        } catch (postgresError) {
          console.error(
            "Failed to add user to PostgreSQL database:",
            postgresError.message
          );
        }
        
      } else {
        isNewUser = true;

        // For new Google users, we need key bundle data
        if (
          !keyBundle ||
          !keyBundle.ik_public ||
          !keyBundle.spk_public ||
          !keyBundle.opks_public ||
          !keyBundle.nonce ||
          !keyBundle.signedPrekeySignature ||
          !keyBundle.salt
        ) {
          return res.status(400).json({
            success: false,
            message: "Key bundle is required for new user registration.",
          });
        }

        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            username: name || email.split("@")[0],
            email: email,
            password: null,
            google_id: google_id,
            avatar_url: picture,
            is_verified: false,
            ik_public: keyBundle.ik_public,
            spk_public: keyBundle.spk_public,
            opks_public: keyBundle.opks_public,
            nonce: keyBundle.nonce,
            signedPrekeySignature: keyBundle.signedPrekeySignature,
            salt: keyBundle.salt,
          })
          .select()
          .single();

        if (createError) {
          throw new Error("Failed to create user: " + createError.message);
        }
        user = newUser;

        const vaultres = await VaultController.storeKeyBundle({
          encrypted_id: user.id,
          ik_private_key: keyBundle.ik_private_key,
          spk_private_key: keyBundle.spk_private_key,
          opks_private: keyBundle.opks_private,
        });

        if (!vaultres || vaultres.error) {
          console.log("Failed to store private keys in vault for Google user");
          return res.status(500).json({
            success: false,
            message: vaultres.error || "Failed to store private keys in vault.",
          });
        }

        try {
          const postgresRes = await axios.post(
            `${
              process.env.FILE_SERVICE_URL || "http://localhost:8081"
            }/addUser`,
            { userId: user.id },
            { headers: { "Content-Type": "application/json" } }
          );
          console.log("Google user successfully added to PostgreSQL database");
        } catch (postgresError) {
          console.error("Failed to add Google user to PostgreSQL database:", postgresError.message);
        }

        try {
          await userService.sendVerificationCode(
            user.id,
            user.email,
            user.username || "User",
            "google_signin"
          );
          console.log("Verification email sent to Google user:", user.email);
        } catch (emailError) {
          console.error(
            "Failed to send verification email to Google user:",
            emailError
          );
        }
      }

      let token = null;
      if (user.is_verified) {
        token = await userService.generateToken(user.id, user.email);
      }

      let keyBundle_response = null;
      if (!isNewUser) {
        try {
          const vaultResult = await VaultController.retrieveKeyBundle(user.id);
          if (vaultResult && !vaultResult.error) {
            keyBundle_response = vaultResult;
          }
        } catch (vaultError) {
          console.warn(
            "Failed to retrieve keys for existing Google user:",
            vaultError.message
          );
        }
      }
      
      // Create or update session for both new and existing Google users
      try {
        // Include request headers for better browser detection (especially Brave)
        deviceInfo.headers = req.headers;
        const sessionResult = await userService.createOrUpdateUserSession(user.id, deviceInfo);
        console.log('Google user session created/updated:', sessionResult?.session?.id);
      } catch (sessionError) {
        console.error('Error creating session for Google user:', sessionError.message);
        // Continue with the authentication process even if session creation fails
      }
      
      // Create or update session for both new and existing Google users
      try {
        // Include request headers for better browser detection (especially Brave)
        deviceInfo.headers = req.headers;
        const sessionResult = await userService.createOrUpdateUserSession(user.id, deviceInfo);
        console.log('Google user session created/updated:', sessionResult?.session?.id);
      } catch (sessionError) {
        console.error('Error creating session for Google user:', sessionError.message);
        // Continue with the authentication process even if session creation fails
      }

      res.status(200).json({
        success: true,
        message: isNewUser
          ? "Account created successfully. Please verify your email."
          : "Login successful",
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            is_verified: user.is_verified,
            ik_public: user.ik_public,
            spk_public: user.spk_public,
            opks_public: user.opks_public,
            nonce: user.nonce,
            signedPrekeySignature: user.signedPrekeySignature,
            salt: user.salt,
          },
          keyBundle: keyBundle_response,
          isNewUser: isNewUser,
        },
      });
    } catch (error) {
      console.error("Google OAuth error:", error.message);
      res.status(500).json({
        success: false,
        message: error.message || "Google authentication failed",
      });
    }
  }

  async verifyToken(req, res) {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
      }
      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, username, avatar_url, is_verified")
        .eq("id", userId)
        .single();
      if (error || !user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error verifying token:", error);
      console.log(
        "Token verification failed for userId:",
        req.user ? req.user.id : "unknown"
      );
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async getUserSessions(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization token missing or invalid.",
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);
      
      if (!decoded.userId) {
        return res.status(400).json({
          success: false,
          message: "Invalid token: User ID not found in token",
        });
      }
      
      const userId = decoded.userId;
      console.log("User ID from token:", userId);
      
      console.log("Fetching sessions for user ID:", userId);
      const sessions = await userService.getUserSessions(userId);
      
      console.log('Raw sessions returned from service:', sessions?.length || 0);
      sessions?.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          id: session.id,
          browser: session.browser_name,
          ip: session.ip_address,
          location: session.location,
          last_login: session.last_login_at,
          is_active: session.is_active
        });
      });

      let updatedSessions = [...sessions];
      try {
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'Unknown';
        console.log('Session fetch - UA:', userAgent?.substring(0, 100) + '...', 'IP:', ipAddress);
        const deviceFingerprint = userService.generateDeviceFingerprint(userAgent, ipAddress);
        
        const browserInfo = userService.parseUserAgent(userAgent);
        console.log('Parsed browser info for update:', browserInfo);
        
        await userService.updateSessionBrowserInfo(userId, deviceFingerprint, browserInfo);
        await userService.updateSessionLastLogin(userId, deviceFingerprint);
        
        const currentTime = new Date().toISOString();
        updatedSessions = sessions.map(session => {
          const sessionFingerprint = userService.generateDeviceFingerprint(
            session.user_agent || '', 
            session.ip_address || ''
          );
          console.log(`Comparing fingerprints: current=${deviceFingerprint}, session=${sessionFingerprint}`);
          if (sessionFingerprint === deviceFingerprint) {
            console.log('Updating session in memory:', session.id);
            return { 
              ...session, 
              last_login_at: currentTime,
              browser_name: browserInfo.browserName,
              browser_version: browserInfo.browserVersion,
              os_name: browserInfo.osName,
              os_version: browserInfo.osVersion,
              device_type: browserInfo.deviceType,
              is_mobile: browserInfo.isMobile,
              is_tablet: browserInfo.isTablet,
              is_desktop: browserInfo.isDesktop
            };
          }
          return session;
        });
      } catch (updateError) {
        console.error('Error updating current session last login:', updateError);
      }

      res.status(200).json({
        success: true,
        message: "User sessions retrieved successfully",
        data: updatedSessions,
        timestamp: new Date().toISOString(),
        debug: {
          userAgent: req.headers['user-agent']?.substring(0, 200),
          ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
          userId: userId
        }
      });
    } catch (error) {
      console.error("Error retrieving user sessions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user sessions",
      });
    }
  }

  async deactivateUserSession(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization token missing or invalid.",
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token (deactivate):", decoded);
      
      if (!decoded.userId) {
        return res.status(400).json({
          success: false,
          message: "Invalid token: User ID not found in token",
        });
      }
      
      const userId = decoded.userId;
      console.log("User ID from token (deactivate):", userId);
      
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required",
        });
      }

      await userService.deactivateUserSession(sessionId, userId);

      res.status(200).json({
        success: true,
        message: "Session deactivated successfully",
      });
    } catch (error) {
      console.error("Error deactivating user session:", error);
      res.status(500).json({
        success: false,
        message: "Failed to deactivate session",
      });
    }
  }

  async createTestSession(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization token missing or invalid.",
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'Unknown';
      const deviceFingerprint = userService.generateDeviceFingerprint(userAgent, ipAddress);
      const browserInfo = userService.parseUserAgent(userAgent);
      const location = userService.getLocationFromIP(ipAddress);

      const deviceInfo = {
        deviceFingerprint,
        userAgent,
        ipAddress,
        location,
        ...browserInfo
      };

      console.log(' Creating test session for user:', userId);
      console.log('Test session device info:', deviceInfo);

      const sessionResult = await userService.createOrUpdateUserSession(userId, deviceInfo);

      console.log(' Test session creation result:', sessionResult);

      res.status(200).json({
        success: true,
        message: "Test session created",
        data: sessionResult
      });
    } catch (error) {
      console.error(' Test session creation error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to create test session",
        error: error.message
      });
    }
  }

  async verifyMnemonic(req, res) {
    try {
      const { mnemonicWords, email } = req.body;
      let userId = req.user?.id;

      if (!userId && email) {
        const userLookup = await userService.getUserIdFromEmail(email);
        if (userLookup && userLookup.userId) {
          userId = userLookup.userId;
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required or valid email must be provided"
        });
      }

      if (!Array.isArray(mnemonicWords) || mnemonicWords.length !== 10) {
        return res.status(400).json({
          success: false,
          error: "Invalid mnemonic: must be exactly 10 words"
        });
      }

      const result = await userService.verifyMnemonic(userId, mnemonicWords, req);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Verify mnemonic error:', error.message);

      if (error.message.includes('Invalid mnemonic')) {
        return res.status(400).json({
          success: false,
          error: "Invalid mnemonic words"
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to verify mnemonic"
      });
    }
  }

  async changePasswordWithMnemonic(req, res) {
    try {
      const { mnemonicWords, newPassword, email } = req.body;
      let userId = req.user?.id;

      if (!userId && email) {
        const userLookup = await userService.getUserIdFromEmail(email);
        if (userLookup && userLookup.userId) {
          userId = userLookup.userId;
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required or valid email must be provided"
        });
      }

      if (!Array.isArray(mnemonicWords) || mnemonicWords.length !== 10) {
        return res.status(400).json({
          success: false,
          error: "Invalid mnemonic: must be exactly 10 words"
        });
      }

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: "New password must be at least 8 characters long"
        });
      }

      const result = await userService.changePasswordWithMnemonic(userId, mnemonicWords, newPassword);

      res.json({
        success: true,
        newMnemonicWords: result.newMnemonicWords,
        message: result.message
      });

    } catch (error) {
      console.error('Change password with mnemonic error:', error.message);

      if (error.message.includes('Invalid mnemonic')) {
        return res.status(400).json({
          success: false,
          error: "Invalid mnemonic words"
        });
      }

      res.status(500).json({
        success: false,
        error: "Password change failed"
      });
    }
  }

  async reEncryptVaultKeysWithMnemonic(req, res) {
    try {
      const { mnemonicWords, newPassword } = req.body;
      const userId = req.user.id;

      if (!mnemonicWords || !Array.isArray(mnemonicWords) || mnemonicWords.length !== 10) {
        return res.status(400).json({
          success: false,
          error: "Please provide exactly 10 mnemonic words"
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          error: "New password is required"
        });
      }

      const userService = require('../services/userService');
      const result = await userService.reEncryptVaultKeysWithMnemonic(userId, mnemonicWords, newPassword);

      res.json({
        success: true,
        message: "Vault keys re-encrypted successfully"
      });

    } catch (error) {
      console.error('Re-encrypt vault keys with mnemonic error:', error.message);

      if (error.message.includes('Invalid mnemonic')) {
        return res.status(400).json({
          success: false,
          error: "Invalid mnemonic words"
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to re-encrypt vault keys"
      });
    }
  }
  
  async checkGoogleAccount(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }
      
      // Check if the user exists and if they're a Google user
      const { data: user, error } = await supabase
        .from("users")
        .select("google_id")
        .eq("email", email)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(error.message);
      }
      
      // Return whether this is a Google account
      const isGoogleAccount = user && user.google_id ? true : false;
      
      return res.status(200).json({
        success: true,
        isGoogleAccount,
        message: isGoogleAccount ? 
          "This email is linked to a Google account" : 
          "This email is not linked to a Google account"
      });
    } catch (error) {
      console.error("Error checking Google account:", error);
      return res.status(500).json({
        success: false,
        message: "Error checking Google account"
      });
    }
  }
}

module.exports = new UserController();
