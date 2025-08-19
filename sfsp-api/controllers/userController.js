const bcrypt = require("bcrypt");
const axios = require("axios");
const { supabase } = require("../config/database");
const userService = require("../services/userService");
const VaultController = require("./vaultController");

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

        // Send verification email for new regular users
        try {
          await userService.sendVerificationCode(
            result.user.id,
            result.user.email,
            result.user.username || "User"
          );
          console.log("Verification email sent to new user:", result.user.email);
        } catch (emailError) {
          console.error("Failed to send verification email to new user:", emailError);
          // Don't fail registration if email sending fails
        }
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
          message: "An account with this email address already exists. Please use a different email or try logging in.",
        });
      }
      
      if (error.message.includes("Failed to create user")) {
        return res.status(400).json({
          success: false,
          message: "Failed to create account. Please check your information and try again.",
        });
      }
      
      if (error.message.includes("Failed to store private keys")) {
        return res.status(500).json({
          success: false,
          message: "Account created but failed to secure your keys. Please try registering again.",
        });
      }
      
      // Generic fallback for unexpected errors
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while creating your account. Please try again.",
      });
    }
  }

  async getUserIdFromEmail(req, res) {
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
    try {
      const { userId} = req.params;
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
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "No user ID provided",
        });
      }

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
        console.log("🔍 DEBUG - Retrieved vault keys for user:", result.user.id);
        console.log("🔍 DEBUG - Retrieved OPKs:", keyBundle.opks_private?.map(opk => opk.opk_id));
        result.keyBundle = keyBundle;
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

      const isValid = await bcrypt.compare(currentPassword, user.password);

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
          message: "User ID is required."
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
          message: "User not found."
        });
      }

      const token = userService.generateToken(userId, user.email);

      return res.status(200).json({
        success: true,
        token
      });
    } catch (error) {
      console.error("Error generating token:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error."
      });
    }
  }

  async getUserInfoFromToken(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization token missing or invalid."
        });
      }

      const token = authHeader.split(" ")[1];
      const result = userService.getDecodedToken(token);

      if (!result.valid) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token."
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          userId: result.decoded.userId,
          email: result.decoded.email
        }
      });
    } catch (error) {
      console.error("Error decoding token:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error."
      });
    }
  }

  async updateNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      const notificationSettings = req.body;

      if (!notificationSettings) {
        return res.status(400).json({ error: 'Notification settings are required' });
      }

      const updatedSettings = await userService.updateNotificationSettings(userId, notificationSettings);

      return res.status(200).json({
        message: 'Notification settings updated successfully',
        data: updatedSettings,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getNotificationSettings(req, res) {
    try {
      const userId = req.user.id;
      const { notificationSettings, email, username } = await userService.getNotificationSettings(userId);
      return res.status(200).json({ data: { notificationSettings, email, username } });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateAvatarUrl(req, res) {
    try {

      console.log('Received updateAvatarUrl request:', { userId: req.user.id, avatar_url: req.body.avatar_url });
      const userId = req.user.id;
      const { avatar_url } = req.body;

      if (!avatar_url && avatar_url !== null) {
        return res.status(400).json({ success: false, message: 'Avatar URL required (or null to remove)' });
      }

      const updatedUrl = await userService.updateAvatarUrl(userId, avatar_url);
      res.status(200).json({ success: true, data: { avatar_url: updatedUrl } });
    } catch (error) {
      console.error('Error in updateAvatarUrl:', error.message);
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

      // Check if user exists with this email
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      let user;
      let isNewUser = false;

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error("Database error: " + checkError.message);
      }

      if (existingUser) {
        if (!existingUser.google_id) {
          const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update({
              google_id: google_id,
              avatar_url: picture || existingUser.avatar_url
            })
            .eq("id", existingUser.id)
            .select()
            .single();

          if (updateError) {
            throw new Error("Failed to update user with Google ID: " + updateError.message);
          }
          user = updatedUser;
        } else {
          user = existingUser;
        }

        // Ensure user is added to PostgreSQL database via file service (for both new and existing users)
        try {
          const postgresRes = await axios.post(
            `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/addUser`,
            { userId: user.id },
            { headers: { "Content-Type": "application/json" } }
          );
          console.log("User successfully ensured in PostgreSQL database");
        } catch (postgresError) {
          console.error("Failed to add user to PostgreSQL database:", postgresError.message);
          // Don't fail the login if PostgreSQL insertion fails
        }
      } else {
        isNewUser = true;
        
        // For new Google users, we need key bundle data
        if (!keyBundle || !keyBundle.ik_public || !keyBundle.spk_public || 
            !keyBundle.opks_public || !keyBundle.nonce || 
            !keyBundle.signedPrekeySignature || !keyBundle.salt) {
          return res.status(400).json({
            success: false,
            message: "Key bundle is required for new user registration.",
          });
        }

        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            username: name || email.split('@')[0],
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

        // Store private keys in vault
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

        // Add user to PostgreSQL database via file service
        try {
          const postgresRes = await axios.post(
            `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/addUser`,
            { userId: user.id },
            { headers: { "Content-Type": "application/json" } }
          );
          console.log("Google user successfully added to PostgreSQL database");
        } catch (postgresError) {
          console.error("Failed to add Google user to PostgreSQL database:", postgresError.message);
          // Don't fail the registration if PostgreSQL insertion fails
        }

        // Send verification email for new Google users using the backend service
        try {
          await userService.sendVerificationCode(
            user.id,
            user.email,
            user.username || "User",
            'google_signin'
          );
          console.log("Verification email sent to Google user:", user.email);
        } catch (emailError) {
          console.error("Failed to send verification email to Google user:", emailError);
        }
      }

      // Only generate token for existing verified users
      let token = null;
      if (!isNewUser && user.is_verified) {
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
          console.warn("Failed to retrieve keys for existing Google user:", vaultError.message);
        }
      }

      res.status(200).json({
        success: true,
        message: isNewUser ? "Account created successfully. Please verify your email." : "Login successful",
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
}

module.exports = new UserController();
