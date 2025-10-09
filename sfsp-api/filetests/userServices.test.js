const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userService = require("../services/userService");
const { supabase } = require("../config/database");

jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("../config/database", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    })),
  },
}));

describe("UserService", () => {
  afterEach(() => jest.clearAllMocks());

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const mockUserData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        ik_public: "ik",
        spk_public: "spk",
        opks_public: "opks",
        nonce: "nonce",
        signedPrekeySignature: "sig",
        salt: "salt",
      };

      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
      });

      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedPassword");

      supabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: "user123",
            username: "testuser",
            email: "test@example.com",
          },
        }),
      });

      jwt.sign.mockReturnValue("fake-jwt");

      const result = await userService.register(mockUserData);

      expect(result).toEqual({
        mnemonicWords: Array [
          "spend",
          "law",
          "promote",
          "happy",
          "they",
          "sunset",
          "minor",
          "slender",
          "sorry",
          "theme"
        ],
        user: {
          id: "user123",
          username: "testuser",
          email: "test@example.com",
          is_verified: undefined,
        },
        token: "fake-jwt",
      });
    });

    it("should throw error if user already exists", async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "existing-id" } }),
      });

      await expect(userService.register({ email: "test@example.com" }))
        .rejects.toThrow("Registration failed: User already exists with this email.");
    });
  });

  describe("getUserIdFromEmail", () => {
    it("should return user ID from email", async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: "abc123" } }),
      });

      const res = await userService.getUserIdFromEmail("a@b.com");
      expect(res).toEqual({ userId: "abc123" });
    });
  });

  describe("generatePIN", () => {
    it("should return a string of 5 characters", () => {
      const pin = userService.generatePIN();
      expect(typeof pin).toBe("string");
      expect(pin).toHaveLength(5);
    });
  });
  describe("getProfile", () => {
    it("should return user profile", async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "user1", username: "User1", email: "user1@example.com" },
        }),
      });

      const res = await userService.getProfile("user1");
      expect(res).toEqual({
        id: "user1",
        username: "User1",
        avatar_url: undefined,
        email: "user1@example.com",
      });
    });

    it("should throw if profile not found", async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: true }),
      });

      await expect(userService.getProfile("nope")).rejects.toThrow(
        "Failed to fetch user profile: User profile not found."
      );
    });
  });

  describe("refreshToken", () => {
    it("should return new token", async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "user1", email: "test@example.com" },
        }),
      });

      jwt.sign.mockReturnValue("newToken");
      const token = await userService.refreshToken("user1");
      expect(token).toBe("newToken");
    });

    it("should throw if user not found", async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: true }),
      });

      await expect(userService.refreshToken("bad")).rejects.toThrow(
        "Failed to refresh token: User not found."
      );
    });
  });

  describe("deleteProfile", () => {
    it("should delete user profile", async () => {
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { email: "x@x.com" } }),
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        });

      const result = await userService.deleteProfile("x@x.com");
      expect(result).toEqual({ message: "Profile deleted successfully." });
    });

    it("should throw if user not found", async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: true }),
      });

      await expect(userService.deleteProfile("notfound@x.com")).rejects.toThrow(
        "Profile deletion failed: User profile not found."
      );
    });

    it("should throw if delete fails", async () => {
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { email: "x@x.com" } }),
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: { message: "fail" } }),
        });

      await expect(userService.deleteProfile("x@x.com")).rejects.toThrow(
        "Profile deletion failed: Failed to delete profile: fail"
      );
    });
  });

  describe("updateProfile", () => {
    it("should update profile and return updated info", async () => {
      supabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "user123", username: "newUser", email: "a@a.com" },
        }),
      });

      const result = await userService.updateProfile("user123", {
        username: "newUser",
      });
      expect(result).toEqual({
        id: "user123",
        username: "newUser",
        email: "a@a.com",
      });
    });

  });
  describe("sendPasswordResetPIN", () => {
    it("should send reset PIN successfully", async () => {
      const mockPIN = "abcde";
      const userId = "user123";

      // Mock generatePIN to return a known value
      jest.spyOn(userService, "generatePIN").mockReturnValue(mockPIN);

      // Mock update success
      supabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { email: "user@example.com", username: "User" },
          }),
        });

      // Mock email sender
      userService.sendResetPINEmail = jest.fn().mockResolvedValue({ success: true });

      const result = await userService.sendPasswordResetPIN(userId);

      expect(userService.sendResetPINEmail).toHaveBeenCalledWith(
        "user@example.com",
        "User",
        mockPIN
      );
      expect(result).toEqual({
        success: true,
        message: "Reset PIN sent to your email",
      });
    });

    it("should throw if user not found", async () => {
      supabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: true }),
        });

      await expect(userService.sendPasswordResetPIN("x")).rejects.toThrow(
        "Failed to send reset PIN: User not found"
      );
    });
  });

  describe("verifyPINAndChangePassword", () => {
    it("should update password if PIN is valid", async () => {
      const userId = "u1";
      const pin = "12345";
      const newPassword = "newpass";

      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              resetPasswordPIN: pin,
              resetPINExpiry: new Date(Date.now() + 60000).toISOString(),
            },
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        });

      bcrypt.hash.mockResolvedValue("hashed");

      const result = await userService.verifyPINAndChangePassword(userId, pin, newPassword);

      expect(result).toEqual({
        success: true,
        message: "Password updated successfully",
      });
    });

    it("should throw if PIN is invalid", async () => {
      const userId = "u1";
      const pin = "wrong";
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            resetPasswordPIN: "12345",
            resetPINExpiry: new Date(Date.now() + 60000).toISOString(),
          },
        }),
      });

      await expect(
        userService.verifyPINAndChangePassword(userId, pin, "newpass")
      ).rejects.toThrow("Failed to change password: Invalid PIN. Please check your email and try again.");
    });

    it("should throw if PIN is expired", async () => {
      const userId = "u1";
      supabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              resetPasswordPIN: "12345",
              resetPINExpiry: new Date(Date.now() - 1000).toISOString(),
            },
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({}),
        });

      await expect(
        userService.verifyPINAndChangePassword(userId, "12345", "newpass")
      ).rejects.toThrow("Failed to change password: Reset PIN has expired. Please request a new one.");
    });

    it("should throw if user not found", async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: true }),
      });

      await expect(
        userService.verifyPINAndChangePassword("u", "pin", "pw")
      ).rejects.toThrow("Failed to change password: User not found");
    });
  });
    describe("getUserIdFromEmail", () => {
    it("should return user id if email exists", async () => {
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "user123" },
          error: null,
        }),
      });

      const result = await userService.getUserIdFromEmail("user@example.com");

      expect(result).toEqual({ userId: "user123" });

    });

  });



 
});

