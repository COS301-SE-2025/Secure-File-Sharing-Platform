import { useState, useEffect, useRef } from "react";
import { Shield, Lock, Key, ArrowLeft } from "lucide-react";
import "./App.css";
import { useNavigate } from "react-router-dom";
import LightRays from "./components/designs/appBack.jsx";
import shieldLogo from '../assets/shield-full-white.png';

function App() {
  const navigate = useNavigate();
  const [step, setStep] = useState("credentials");
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    otp: ["", "", "", "", "", ""],
  });
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);

  const [token, setToken] = useState(null);

  const focusInput = (index) => {
    const input = inputRefs.current[index];
    if (input) {
      input.focus();
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setCredentials({ ...credentials, otp: "" });
  };

  const handleOTPKeyDown = (e, index) => {
    const otpArr = [...credentials.otp];

    if (e.key === "Backspace") {
      if (otpArr[index]) {
        otpArr[index] = "";
        setCredentials({ ...credentials, otp: otpArr });
      } else if (index > 0) {
        focusInput(index - 1);
        otpArr[index - 1] = "";
        setCredentials({ ...credentials, otp: otpArr });
      }
      e.preventDefault();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
      e.preventDefault();
    }

    if (e.key === "ArrowRight" && index < 5) {
      focusInput(index + 1);
      e.preventDefault();
    }
  };

  const handleOTPPaste = (e, startIndex = 0) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").slice(0, 6).split("");
    const otpArr = [...credentials.otp];

    for (let i = 0; i < paste.length && startIndex + i < 6; i++) {
      otpArr[startIndex + i] = paste[i];
    }

    setCredentials({ ...credentials, otp: otpArr });
    focusInput(Math.min(startIndex + paste.length, 5));
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      alert("❌ Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(`❌ ${data.message}`);
        setIsLoading(false);
        return;
      }

      setToken(data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      localStorage.setItem("token", data.data.token);

      const otpRes = await fetch("http://localhost:5000/api/admin/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.data.user.id,
          email: data.data.user.email,
          username: data.data.user.username
        }),
      });

      const otpData = await otpRes.json();
      if (!otpData.success) {
        alert(`⚠️ Could not send OTP: ${otpData.message}`);
        return;
      }

      setStep("otp");
    } catch (err) {
      console.error("Login error:", err);
      alert("❌ Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    const otpCode = credentials.otp.join("");

    if (otpCode.length !== 6) {
      alert("❌ Please enter a valid 6-digit PIN");
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      const res = await fetch("http://localhost:5000/api/admin/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          code: otpCode,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(`❌ Verification failed: ${data.message}`);
        return;
      }

      navigate("/dashboard", { state: { token } });
    } catch (err) {
      console.error("OTP verification failed:", err);
      alert("❌ An error occurred while verifying OTP");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="login-container">
      <div className="background-wrapper">
        <LightRays
          raysOrigin="top-center"
          raysColor="#00ffff"
          raysSpeed={1.5}
          lightSpread={0.8}
          rayLength={1.2}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
          className="custom-rays"
        />
      </div>

      <div className="login-box">
        <div className="login-header">
          <div className="login-logo">
            <img src={shieldLogo} alt="SecureShare Logo" className="logo-icon" />
          </div>
          <h1 className="login-title">SecureShare</h1>
          <p className="login-subtitle">Admin Portal Access</p>
        </div>

        <div className="card-boxed">
          <div className="card-header">
            {step === "otp" && (
              <button onClick={handleBackToCredentials} className="back-btn" type="button">
                <ArrowLeft size={16} />
              </button>
            )}

            <div className="card-header-content">
              <h2 className="card-title">{step === "credentials" ? "" : "PIN"}</h2>
              <p className="card-description">
                {step === "credentials"
                  ? "Enter your email and password to continue"
                  : "Enter your 6-digit one-time PIN to complete login"}
              </p>
            </div>
          </div>

          <div className="card-content">
            {step === "credentials" ? (
              <form onSubmit={handleCredentialsSubmit} className="form">
                <div className="form-group">
                  <label htmlFor="username">Email</label>
                  <input
                    className="username-input"
                    id="username"
                    type="text"
                    placeholder="Enter your email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-icon-wrapper">
                    <Lock className="input-icon" size={16} />
                    <input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Continue"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOTPSubmit} className="form">
                <div className="otp-section">
                  <Key size={48} className="otp-icon" />
                  <p className="otp-text">Please enter the 6-digit code from your email</p>
                  <div className="otp-inputs">
                    {[...Array(6)].map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        ref={(el) => (inputRefs.current[i] = el)}
                        value={credentials.otp[i]}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          const otpArr = [...credentials.otp];
                          otpArr[i] = val;
                          setCredentials({ ...credentials, otp: otpArr });
                          if (val && i < 5) focusInput(i + 1);
                        }}
                        onKeyDown={(e) => {
                          if (!/[0-9]/.test(e.key) && !["Backspace", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                            e.preventDefault();
                          }
                          handleOTPKeyDown(e, i);
                        }}
                        onPaste={(e) => handleOTPPaste(e, i)}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn" disabled={isLoading || credentials.otp.join("").length !== 6}>
                  {isLoading ? "Authenticating..." : "Verify & Login"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
