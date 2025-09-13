import { useState, useEffect, useRef } from "react";
import { Shield, Lock, Key, ArrowLeft } from "lucide-react";
import "./App.css";

function App() {
  const [step, setStep] = useState("credentials");
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    otp: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);

  console.log("window.electron", window.electron);

  useEffect(() => {
    const unsubscribe = window.electron.subscribeStatistics((stats) => {
      console.log("Stats:", stats);
    });

    return () => unsubscribe();
  }, []);

  const handleCredentialsSubmit = (e) => {
    e.preventDefault();
    if (!credentials.username || !credentials.password) {
      alert("❌ Please enter both username and password");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setStep("otp");
      setIsLoading(false);
    }, 1000);
  };

  const handleOTPSubmit = (e) => {
    e.preventDefault();
    if (!credentials.otp || credentials.otp.length !== 6) {
      alert("❌ Please enter a valid 6-digit PIN");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to dashboard here if you want
    }, 1000);
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setCredentials({ ...credentials, otp: "" });
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Logo and Header */}
        <div className="login-header">
          <div className="login-logo">
            <Shield size={32} className="logo-icon" />
          </div>
          <h1 className="login-title">SecureShare</h1>
          <p className="login-subtitle">Admin Portal Access</p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              {step === "otp" && (
                <button
                  onClick={handleBackToCredentials}
                  className="back-btn"
                  type="button"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              {step === "credentials"
                ? ""
                : "PIN"}
            </h2>
            <p className="card-description">
              {step === "credentials"
                ? "Enter your username and password to continue"
                : "Enter your 6-digit one-time PIN to complete login"}
            </p>
          </div>

          <div className="card-content">
            {step === "credentials" ? (
              <form onSubmit={handleCredentialsSubmit} className="form">
                {/* Username */}
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    className="username-input"
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={credentials.username}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        username: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {/* Password */}
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-icon-wrapper">
                    <Lock className="input-icon" size={16} />
                    <input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={(e) =>
                        setCredentials({
                          ...credentials,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" className="btn" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Continue"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOTPSubmit} className="form">
                <div className="otp-section">
                  <Key size={48} className="otp-icon" />
                  <p className="otp-text">
                    Please enter the 6-digit code from your email
                  </p>

                  <div className="otp-inputs">
                    {[...Array(6)].map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        ref={(el) => (inputRefs.current[i] = el)}
                        value={credentials.otp[i] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          if (!val) return;

                          const newOtp = credentials.otp.split("");
                          newOtp[i] = val;
                          setCredentials({ ...credentials, otp: newOtp.join("") });

                          // Move focus to next input
                          if (i < 5) inputRefs.current[i + 1].focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            const newOtp = credentials.otp.split("");
                            newOtp[i] = "";
                            setCredentials({ ...credentials, otp: newOtp.join("") });

                            // Move back if empty
                            if (i > 0 && !credentials.otp[i]) {
                              inputRefs.current[i - 1].focus();
                            }
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const paste = e.clipboardData.getData("text").slice(0, 6);
                          const newOtp = [...paste.padEnd(6, "")].join("");
                          setCredentials({ ...credentials, otp: newOtp });
                          inputRefs.current[Math.min(paste.length, 5)].focus();
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn"
                  disabled={isLoading || credentials.otp.length !== 6}
                >
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
