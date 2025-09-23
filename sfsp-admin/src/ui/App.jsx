import { useState, useEffect, useRef } from "react";
import { Shield, Lock, Key, ArrowLeft } from "lucide-react";
import "./App.css";
import { useNavigate } from "react-router-dom";
import LightRays from "./components/designs/appBack.jsx";

function App() {
  const navigate = useNavigate();
  const [step, setStep] = useState("credentials");
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    otp: ["", "", "", "", "", ""],
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
      navigate("/dashboard");
    }, 1000);
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setCredentials({ ...credentials, otp: "" });
  };

  const focusInput = (index) => {
    const input = inputRefs.current[index];
    if (input) {
      input.focus();
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
  };

  const handleOTPKeyDown = (e, index) => {
    const otpArr = [...credentials.otp];

    if (e.key === "Backspace") {
      if (otpArr[index]) {
        otpArr[index] = "";
        setCredentials({ ...credentials, otp: otpArr });
      } else if (index > 0) {

        focusInput(index - 1);
        const prevArr = [...credentials.otp];
        prevArr[index - 1] = "";
        setCredentials({ ...credentials, otp: prevArr });
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

  return (
    <div className="login-container">
      <div className="background-wrapper">
        {/* The lightRays Code from: 
https://reactbits.dev/backgrounds/light-rays , 18 September 2025*/}
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
        {/* Logo and Header */}
        <div className="login-header">
          <div className="login-logo">
            <img
              src="/src/assets/shield-full-white.png"
              alt="SecureShare Logo"
              className="logo-icon"
            />

          </div>
          <h1 className="login-title">SecureShare</h1>
          <p className="login-subtitle">Admin Portal Access</p>
        </div>

        {/* Card */}
        <div className="card-boxed">
          <div className="card-header">
            {step === "otp" && (
              <button
                onClick={handleBackToCredentials}
                className="back-btn"
                type="button"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <div className="card-header-content">
              <h2 className="card-title">
                {step === "credentials" ? "" : "PIN"}
              </h2>
              <p className="card-description">
                {step === "credentials"
                  ? "Enter your username and password to continue"
                  : "Enter your 6-digit one-time PIN to complete login"}
              </p>
            </div>
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
                          if (
                            !/[0-9]/.test(e.key) &&
                            e.key !== "Backspace" &&
                            e.key !== "ArrowLeft" &&
                            e.key !== "ArrowRight" &&
                            e.key !== "Tab"
                          ) {
                            e.preventDefault();
                          }

                          handleOTPKeyDown(e, i);
                        }}
                        onPaste={(e) => handleOTPPaste(e, i)}
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
