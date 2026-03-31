import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Mail, Lock, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const HowItWorksPage = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, googleLogin, isAuthenticated } = useAuth();

  // Login handlers
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const result = await login(loginEmail, loginPassword);
      if (result.success) {
        setShowLoginModal(false);
        navigate("/dashboard");
      } else {
        setLoginError(
          result.error || "Login failed. Please check your credentials.",
        );
      }
    } catch (err) {
      setLoginError("An error occurred. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        setShowLoginModal(false);
        navigate("/dashboard");
      } else {
        setLoginError(result.error || "Google login failed. Please try again.");
      }
    } catch (err) {
      setLoginError("An error occurred during Google login. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleError = () => {
    setLoginError("Google login failed. Please try again.");
  };

  return (
    <div
      style={{
        fontFamily: "'Manrope', sans-serif",
        background: "#faf9f6",
        color: "#1b1c1a",
        minHeight: "100vh",
      }}
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600;700&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* Top Banner */}
      <div
        style={{
          background: "#1b1c1a",
          color: "rgba(255,255,255,0.8)",
          textAlign: "center",
          padding: "10px 20px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.02em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            background: "#1D9E75",
            color: "white",
            padding: "2px 12px",
            borderRadius: "999px",
            fontSize: "10px",
            fontWeight: "bold",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          ⚡ Source-available
        </span>
        invari is source-available under the
        <a
          href="https://polyformproject.org/licenses/noncommercial/1.0.0/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#1D9E75", textDecoration: "none", fontWeight: 600 }}
        >
          PolyForm Noncommercial License 1.0.0
        </a>
        — free to self-host for non-commercial use.
        <a
          href="https://github.com/arabindanarayandas/invari"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "rgba(255,255,255,0.8)",
            borderBottom: "1px solid rgba(255,255,255,0.3)",
            textDecoration: "none",
            transition: "all 0.2s",
          }}
        >
          View on GitHub →
        </a>
      </div>

      {/* Navigation */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          width: "100%",
          zIndex: 50,
          background: "rgba(250, 249, 246, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(188, 202, 193, 0.4)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 24px",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            to="/"
            style={{
              fontFamily: "'Noto Serif', serif",
              fontSize: "18px",
              fontWeight: "bold",
              color: "#1b1c1a",
              textDecoration: "none",
            }}
          >
            invari<span style={{ color: "#1D9E75" }}>.ai</span>
          </Link>
          <div
            style={{ display: "flex", alignItems: "center", gap: "32px" }}
            className="nav-links"
          >
            <Link
              to="/how-it-works"
              style={{
                fontSize: "14px",
                color: "#3d4943",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              How it works
            </Link>
            <Link
              to="/pricing"
              style={{
                fontSize: "14px",
                color: "#3d4943",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              Pricing
            </Link>
            <a
              href="https://github.com/arabindanarayandas/invari"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "14px",
                color: "#3d4943",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              GitHub
            </a>
            <Link
              to="/contact"
              style={{
                fontSize: "14px",
                color: "#3d4943",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              Contact
            </Link>
          </div>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              style={{
                background: "#1b1c1a",
                color: "white",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: "6px",
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
            >
              Dashboard →
            </Link>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              style={{
                background: "#1b1c1a",
                color: "white",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      <main style={{ paddingTop: "48px", paddingBottom: "96px" }}>
        <div
          style={{ maxWidth: "1024px", margin: "0 auto", padding: "0 32px" }}
        >
          {/* PAGE HEADER */}
          <div style={{ marginBottom: "80px" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1D9E75",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: "20px",
              }}
            >
              How it works
            </div>
            <h1
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(48px, 5vw, 60px)",
                lineHeight: 1.05,
                marginBottom: "24px",
                maxWidth: "800px",
              }}
            >
              One layer. Zero changes to your stack.
            </h1>
            <p
              style={{
                fontSize: "18px",
                color: "#3d4943",
                maxWidth: "640px",
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              Point your agent's outbound calls through invari, provide your
              OpenAPI spec, and invari handles validation, repair, and
              forwarding in under 30ms. Your agent doesn't change. Your API
              doesn't change.
            </p>
          </div>

          {/* ARCHITECTURE DIAGRAM */}
          <div style={{ marginBottom: "64px" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1D9E75",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: "16px",
              }}
            >
              Architecture
            </div>
            <h2
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(30px, 4vw, 36px)",
                marginBottom: "40px",
                lineHeight: 1.2,
              }}
            >
              The proxy sits between agent and API.
            </h2>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {/* Agent */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid rgba(188, 202, 193, 0.3)",
                  boxShadow: "0 2px 8px rgba(27,28,26,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#efeeeb",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "18px",
                        color: "#3d4943",
                        fontVariationSettings:
                          "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                      }}
                    >
                      smart_toy
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>
                      AI Agent
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        color: "#3d4943",
                      }}
                    >
                      LangChain · AutoGPT · Custom agent
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      background: "#efeeeb",
                      color: "#3d4943",
                      padding: "4px 12px",
                      borderRadius: "2px",
                    }}
                  >
                    outbound call
                  </div>
                </div>
                <div
                  style={{
                    background: "#efeeeb",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "#3d4943",
                    lineHeight: 1.6,
                  }}
                >
                  POST /api/check_availability &nbsp;·&nbsp;{" "}
                  <span style={{ color: "#ba1a1a" }}>
                    "date": "tomorrow at 4pm"
                  </span>{" "}
                  &nbsp;·&nbsp;{" "}
                  <span style={{ color: "#ba1a1a" }}>"party_size": "Ten"</span>
                </div>
              </div>

              {/* Arrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  paddingLeft: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "1px",
                      height: "12px",
                      background: "#bccac1",
                    }}
                  ></div>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "16px",
                      color: "#bccac1",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    keyboard_arrow_down
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "#ba1a1a",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                  }}
                >
                  malformed
                </span>
              </div>

              {/* invari */}
              <div
                style={{
                  background: "#1D9E75",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 4px 20px rgba(29,158,117,0.18)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "18px",
                        color: "white",
                        fontVariationSettings:
                          "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                      }}
                    >
                      tune
                    </span>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "white",
                      }}
                    >
                      invari
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      validates · repairs · forwards
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                        padding: "4px 12px",
                        borderRadius: "2px",
                      }}
                    >
                      94.5% confidence
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                        padding: "4px 12px",
                        borderRadius: "2px",
                      }}
                    >
                      22ms
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.8)",
                    lineHeight: 1.6,
                  }}
                >
                  ✓ &nbsp;"date" → "2026-03-26T16:00:00Z" &nbsp;·&nbsp;
                  "party_size" → 10 (int) &nbsp;·&nbsp; repaired &amp; forwarded
                </div>
              </div>

              {/* Arrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  paddingLeft: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "1px",
                      height: "12px",
                      background: "#bccac1",
                    }}
                  ></div>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "16px",
                      color: "#bccac1",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    keyboard_arrow_down
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "#1D9E75",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                  }}
                >
                  repaired
                </span>
              </div>

              {/* API */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid rgba(188, 202, 193, 0.3)",
                  boxShadow: "0 2px 8px rgba(27,28,26,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#efeeeb",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "18px",
                        color: "#3d4943",
                        fontVariationSettings:
                          "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                      }}
                    >
                      api
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>
                      Your API
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        color: "#3d4943",
                      }}
                    >
                      REST · GraphQL · Any OpenAPI spec
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      background: "#d4f0e7",
                      color: "#1D9E75",
                      padding: "4px 12px",
                      borderRadius: "2px",
                      fontWeight: 600,
                    }}
                  >
                    200 OK
                  </div>
                </div>
                <div
                  style={{
                    background: "#f0faf5",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "#1D9E75",
                    lineHeight: 1.6,
                    borderLeft: "2px solid #1D9E75",
                  }}
                >
                  Receives clean, spec-compliant call every time. No 400 errors.
                  No retries. No dead air.
                </div>
              </div>
            </div>
          </div>

          {/* DIVIDER */}
          <div
            style={{
              borderTop: "1px solid rgba(188, 202, 193, 0.3)",
              margin: "64px 0",
            }}
          ></div>

          {/* 3 STEPS */}
          <div style={{ marginBottom: "64px" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1D9E75",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: "16px",
              }}
            >
              Setup
            </div>
            <h2
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(30px, 4vw, 36px)",
                marginBottom: "40px",
                lineHeight: 1.2,
              }}
            >
              Three steps. No SDK. Just a URL change.
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  alignItems: "flex-start",
                  padding: "32px 0",
                  borderBottom: "1px solid rgba(188, 202, 193, 0.3)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#1D9E75",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  1
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      marginBottom: "8px",
                    }}
                  >
                    Route your agent's requests through invari
                  </h3>
                  <p
                    style={{
                      color: "#3d4943",
                      lineHeight: 1.6,
                      fontSize: "14px",
                    }}
                  >
                    Point your AI agent's outgoing API calls to invari's proxy
                    endpoint instead of your API directly. No SDK required —
                    it's just a URL change. Docker or npm package, your choice.
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  alignItems: "flex-start",
                  padding: "32px 0",
                  borderBottom: "1px solid rgba(188, 202, 193, 0.3)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#1D9E75",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  2
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      marginBottom: "8px",
                    }}
                  >
                    invari validates and repairs in &lt;30ms
                  </h3>
                  <p
                    style={{
                      color: "#3d4943",
                      lineHeight: 1.6,
                      fontSize: "14px",
                    }}
                  >
                    invari validates each request against your OpenAPI spec.
                    Wrong types, wrong field names, natural language values,
                    missing required fields — all repaired deterministically. No
                    LLM in the repair path. Fast, auditable, predictable.
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  alignItems: "flex-start",
                  padding: "32px 0",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#1D9E75",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  3
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      marginBottom: "8px",
                    }}
                  >
                    Your API receives clean, spec-compliant calls every time
                  </h3>
                  <p
                    style={{
                      color: "#3d4943",
                      lineHeight: 1.6,
                      fontSize: "14px",
                    }}
                  >
                    Every request that passes through invari is guaranteed to
                    match your spec. Blocked threats never reach your server.
                    Repairs are logged with full before/after detail, confidence
                    score, and latency breakdown.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* DIVIDER */}
          <div
            style={{
              borderTop: "1px solid rgba(188, 202, 193, 0.3)",
              margin: "64px 0",
            }}
          ></div>

          {/* WHAT IT REPAIRS */}
          <div style={{ marginBottom: "64px" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1D9E75",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: "16px",
              }}
            >
              What gets repaired
            </div>
            <h2
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(30px, 4vw, 36px)",
                marginBottom: "40px",
                lineHeight: 1.2,
              }}
            >
              The exact mistakes agents make.
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "#3d4943",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: "16px",
                  }}
                >
                  Type coercion
                </div>
                <div
                  style={{
                    background: "#efeeeb",
                    borderRadius: "4px",
                    padding: "16px",
                    borderLeft: "2px solid #bccac1",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#ba1a1a",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: "8px",
                    }}
                  >
                    Incoming
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      color: "#3d4943",
                    }}
                  >
                    "party_size":{" "}
                    <span style={{ color: "#ba1a1a" }}>"Five"</span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(188, 202, 193, 0.4)",
                    }}
                  ></div>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "14px",
                      color: "#1D9E75",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    keyboard_arrow_down
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#1D9E75",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    repaired
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(188, 202, 193, 0.4)",
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    background: "#f0faf5",
                    borderRadius: "4px",
                    padding: "16px",
                    borderLeft: "2px solid #1D9E75",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      color: "#1b1c1a",
                    }}
                  >
                    "guest_count":{" "}
                    <span style={{ color: "#1D9E75", fontWeight: 700 }}>5</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "#3d4943",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: "16px",
                  }}
                >
                  Date normalization
                </div>
                <div
                  style={{
                    background: "#efeeeb",
                    borderRadius: "4px",
                    padding: "16px",
                    borderLeft: "2px solid #bccac1",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#ba1a1a",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: "8px",
                    }}
                  >
                    Incoming
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      color: "#3d4943",
                    }}
                  >
                    "date":{" "}
                    <span style={{ color: "#ba1a1a" }}>"tomorrow at 4pm"</span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(188, 202, 193, 0.4)",
                    }}
                  ></div>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "14px",
                      color: "#1D9E75",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    keyboard_arrow_down
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#1D9E75",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    repaired
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(188, 202, 193, 0.4)",
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    background: "#f0faf5",
                    borderRadius: "4px",
                    padding: "16px",
                    borderLeft: "2px solid #1D9E75",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      color: "#1b1c1a",
                    }}
                  >
                    "appointment_date":{" "}
                    <span style={{ color: "#1D9E75", fontWeight: 700 }}>
                      "2026-03-14T16:00:00Z"
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "#3d4943",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: "16px",
                  }}
                >
                  Boolean coercion
                </div>
                <div
                  style={{
                    background: "#efeeeb",
                    borderRadius: "4px",
                    padding: "16px",
                    borderLeft: "2px solid #bccac1",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#ba1a1a",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: "8px",
                    }}
                  >
                    Incoming
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      color: "#3d4943",
                    }}
                  >
                    "active": <span style={{ color: "#ba1a1a" }}>"true"</span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(188, 202, 193, 0.4)",
                    }}
                  ></div>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "14px",
                      color: "#1D9E75",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    keyboard_arrow_down
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#1D9E75",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    repaired
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(188, 202, 193, 0.4)",
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    background: "#f0faf5",
                    borderRadius: "4px",
                    padding: "16px",
                    borderLeft: "2px solid #1D9E75",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      color: "#1b1c1a",
                    }}
                  >
                    "active":{" "}
                    <span style={{ color: "#1D9E75", fontWeight: 700 }}>
                      true
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "#3d4943",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: "16px",
                  }}
                >
                  Field rename
                </div>
                <div
                  style={{
                    background: "#efeeeb",
                    borderRadius: "4px",
                    padding: "16px",
                    borderLeft: "2px solid #bccac1",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#ba1a1a",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: "8px",
                    }}
                  >
                    Incoming
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      color: "#3d4943",
                    }}
                  >
                    "location_id":{" "}
                    <span style={{ color: "#ba1a1a" }}>"downtown"</span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(188, 202, 193, 0.4)",
                    }}
                  ></div>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "14px",
                      color: "#1D9E75",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    keyboard_arrow_down
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#1D9E75",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    repaired
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "rgba(188, 202, 193, 0.4)",
                    }}
                  ></div>
                </div>
                <div
                  style={{
                    background: "#f0faf5",
                    borderRadius: "4px",
                    padding: "16px",
                    borderLeft: "2px solid #1D9E75",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      color: "#1b1c1a",
                    }}
                  >
                    "venue_id":{" "}
                    <span style={{ color: "#1D9E75", fontWeight: 700 }}>
                      "downtown"
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DIVIDER */}
          <div
            style={{
              borderTop: "1px solid rgba(188, 202, 193, 0.3)",
              margin: "64px 0",
            }}
          ></div>

          {/* USE CASES */}
          <div style={{ marginBottom: "64px" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1D9E75",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: "16px",
              }}
            >
              Use cases
            </div>
            <h2
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(30px, 4vw, 36px)",
                marginBottom: "40px",
                lineHeight: 1.2,
              }}
            >
              Where agents are breaking in production.
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "24px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "28px",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    background: "rgba(29, 158, 117, 0.1)",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "20px",
                      color: "#1D9E75",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    mic
                  </span>
                </div>
                <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>
                  Voice AI pipelines
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#3d4943",
                    lineHeight: 1.6,
                    marginBottom: "20px",
                  }}
                >
                  Natural language bleeds into API payloads. The retry fires.
                  Dead air. The user hangs up.
                </p>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#1D9E75",
                    background: "#d4f0e7",
                    padding: "8px 12px",
                    borderRadius: "4px",
                  }}
                >
                  Sub-perceptual latency — no silence on calls
                </div>
              </div>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "28px",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    background: "rgba(29, 158, 117, 0.1)",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "20px",
                      color: "#1D9E75",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    account_tree
                  </span>
                </div>
                <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>
                  Workflow agents
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#3d4943",
                    lineHeight: 1.6,
                    marginBottom: "20px",
                  }}
                >
                  Type mismatch on a critical field. The automation breaks at
                  2am. No alert until morning.
                </p>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#1D9E75",
                    background: "#d4f0e7",
                    padding: "8px 12px",
                    borderRadius: "4px",
                  }}
                >
                  Silent failures become auditable repair logs
                </div>
              </div>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "28px",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    background: "rgba(29, 158, 117, 0.1)",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "20px",
                      color: "#1D9E75",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    }}
                  >
                    corporate_fare
                  </span>
                </div>
                <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>
                  Enterprise integrations
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#3d4943",
                    lineHeight: 1.6,
                    marginBottom: "20px",
                  }}
                >
                  Wrong field name on an external call. The pipeline stalls.
                  Compliance is watching.
                </p>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#1D9E75",
                    background: "#d4f0e7",
                    padding: "8px 12px",
                    borderRadius: "4px",
                  }}
                >
                  Hard validation the LLM cannot bypass
                </div>
              </div>
            </div>
          </div>

          {/* DIVIDER */}
          <div
            style={{
              borderTop: "1px solid rgba(188, 202, 193, 0.3)",
              margin: "64px 0",
            }}
          ></div>

          {/* STATS */}
          <div style={{ marginBottom: "64px" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1D9E75",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: "16px",
              }}
            >
              Tested in production
            </div>
            <h2
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(30px, 4vw, 36px)",
                marginBottom: "40px",
                lineHeight: 1.2,
              }}
            >
              The numbers speak for themselves.
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Serif', serif",
                    fontSize: "36px",
                    color: "#1D9E75",
                    marginBottom: "8px",
                  }}
                >
                  121,400
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#3d4943",
                    lineHeight: 1.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Requests in
                  <br />
                  24hr soak test
                </div>
              </div>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Serif', serif",
                    fontSize: "36px",
                    color: "#1D9E75",
                    marginBottom: "8px",
                  }}
                >
                  40%
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#3d4943",
                    lineHeight: 1.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Required repair
                  <br />
                  before the API
                </div>
              </div>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Serif', serif",
                    fontSize: "36px",
                    color: "#1D9E75",
                    marginBottom: "8px",
                  }}
                >
                  27%
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#3d4943",
                    lineHeight: 1.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Blocked as
                  <br />
                  security threats
                </div>
              </div>
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                  border: "1px solid rgba(188, 202, 193, 0.2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Serif', serif",
                    fontSize: "36px",
                    color: "#1D9E75",
                    marginBottom: "8px",
                  }}
                >
                  &lt;30ms
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#3d4943",
                    lineHeight: 1.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Overhead
                  <br />
                  per request
                </div>
              </div>
            </div>
          </div>

          {/* DIVIDER */}
          <div
            style={{
              borderTop: "1px solid rgba(188, 202, 193, 0.3)",
              margin: "64px 0",
            }}
          ></div>

          {/* SELF HOSTING */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "40px",
              border: "1px solid rgba(188, 202, 193, 0.2)",
              marginBottom: "64px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "40px",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#1D9E75",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    marginBottom: "16px",
                  }}
                >
                  Licensing
                </div>
                <h2
                  style={{
                    fontFamily: "'Noto Serif', serif",
                    fontSize: "clamp(24px, 3vw, 30px)",
                    marginBottom: "16px",
                    lineHeight: 1.2,
                  }}
                >
                  Self-host invari for free.
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#3d4943",
                    lineHeight: 1.6,
                    marginBottom: "12px",
                  }}
                >
                  invari is source-available under the{" "}
                  <strong style={{ color: "#1b1c1a" }}>
                    PolyForm Noncommercial License 1.0.0
                  </strong>
                  . Run it yourself, inspect every line of code, and modify it
                  freely — for non-commercial use.
                </p>
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "#3d4943",
                  }}
                >
                  Commercial use in production? That's what our hosted plans are
                  for.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  flexShrink: 0,
                  width: "210px",
                }}
              >
                <a
                  href="https://github.com/arabindanarayandas/invari"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "#1b1c1a",
                    color: "white",
                    padding: "12px 20px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "opacity 0.15s",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  View on GitHub
                </a>
                <a
                  href="https://polyformproject.org/licenses/noncommercial/1.0.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    border: "1px solid #bccac1",
                    color: "#1b1c1a",
                    padding: "12px 20px",
                    borderRadius: "6px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    textDecoration: "none",
                    transition: "border-color 0.15s",
                  }}
                >
                  PolyForm Noncommercial 1.0.0 ↗
                </a>
                <Link
                  to="/pricing"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#d4f0e7",
                    color: "#1D9E75",
                    padding: "12px 20px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                >
                  See commercial plans →
                </Link>
              </div>
            </div>
          </div>

          {/* CTA STRIP */}
          <div
            style={{
              background: "#1b1c1a",
              borderRadius: "12px",
              padding: "40px",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "'Noto Serif', serif",
                  fontSize: "clamp(24px, 3vw, 30px)",
                  color: "white",
                  marginBottom: "8px",
                  fontWeight: 400,
                }}
              >
                Ready to make your API AI-proof?
              </h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>
                Paste your URL and see your risk in 15 seconds. Free, no signup
                needed.
              </p>
            </div>
            <Link
              to="/"
              style={{
                flexShrink: 0,
                background: "#1D9E75",
                color: "white",
                fontSize: "14px",
                fontWeight: 600,
                padding: "12px 28px",
                borderRadius: "6px",
                textDecoration: "none",
                transition: "opacity 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              Try it free →
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer
        style={{
          background: "#f4f3f0",
          borderTop: "1px solid rgba(188, 202, 193, 0.3)",
          paddingTop: "56px",
          paddingBottom: "40px",
          marginTop: 0,
        }}
      >
        <div
          style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "40px",
              marginBottom: "40px",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Noto Serif', serif",
                  fontSize: "18px",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                invari<span style={{ color: "#1D9E75" }}>.ai</span>
              </div>
              <p
                style={{ fontSize: "14px", color: "#3d4943", lineHeight: 1.6 }}
              >
                AI infrastructure for enterprise agent pipelines.
              </p>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#6d7a73",
                  marginBottom: "20px",
                }}
              >
                Product
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <li>
                  <Link
                    to="/how-it-works"
                    style={{
                      fontSize: "14px",
                      color: "#3d4943",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    style={{
                      fontSize: "14px",
                      color: "#3d4943",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/arabindanarayandas/invari"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "14px",
                      color: "#3d4943",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <Link
                    to="/"
                    style={{
                      fontSize: "14px",
                      color: "#3d4943",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                  >
                    Live demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#6d7a73",
                  marginBottom: "20px",
                }}
              >
                Company
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <li>
                  <Link
                    to="/contact"
                    style={{
                      fontSize: "14px",
                      color: "#3d4943",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/arabindanarayandas/invari"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "14px",
                      color: "#3d4943",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                  >
                    Open an issue
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#6d7a73",
                  marginBottom: "20px",
                }}
              >
                Contact
              </div>
              <a
                href="mailto:"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "14px",
                  color: "#1D9E75",
                  textDecoration: "none",
                }}
              ></a>
            </div>
          </div>
          <div
            style={{
              paddingTop: "32px",
              borderTop: "1px solid rgba(188, 202, 193, 0.3)",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "#3d4943",
                margin: 0,
              }}
            >
              © 2026 invari.ai. Source-available under{" "}
              <a
                href="https://polyformproject.org/licenses/noncommercial/1.0.0/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1D9E75", textDecoration: "none" }}
              >
                PolyForm Noncommercial
              </a>
              .
            </p>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "#3d4943",
              }}
            >
              Built for teams shipping AI agents into production.
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "460px",
              width: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <h2
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontSize: "28px",
                  fontWeight: 400,
                  color: "#1a1916",
                }}
              >
                Sign In
              </h2>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X
                  style={{ width: "20px", height: "20px", color: "#6b6860" }}
                />
              </button>
            </div>
            <p
              style={{
                fontSize: "14px",
                color: "#6b6860",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              Access your account to manage and protect your APIs
            </p>

            {/* Error Message */}
            {loginError && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px 16px",
                  background: "#fde8e8",
                  border: "1px solid #E24B4A",
                  borderRadius: "8px",
                }}
              >
                <p style={{ color: "#E24B4A", fontSize: "14px" }}>
                  {loginError}
                </p>
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleEmailLogin} style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#1a1916",
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.04em",
                    marginBottom: "8px",
                  }}
                >
                  EMAIL
                </label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Mail
                    style={{
                      position: "absolute",
                      left: "12px",
                      width: "16px",
                      height: "16px",
                      color: "#6b6860",
                    }}
                  />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isLoggingIn}
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 40px",
                      border: "1px solid #e2e0d8",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "'DM Sans', sans-serif",
                      background: "#ffffff",
                      color: "#1a1916",
                      outline: "none",
                      transition: "border-color 0.15s",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#1a1916",
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.04em",
                    marginBottom: "8px",
                  }}
                >
                  PASSWORD
                </label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Lock
                    style={{
                      position: "absolute",
                      left: "12px",
                      width: "16px",
                      height: "16px",
                      color: "#6b6860",
                    }}
                  />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoggingIn}
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 40px",
                      border: "1px solid #e2e0d8",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontFamily: "'DM Sans', sans-serif",
                      background: "#ffffff",
                      color: "#1a1916",
                      outline: "none",
                      transition: "border-color 0.15s",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: isLoggingIn ? "#e2e0d8" : "#1D9E75",
                  color: isLoggingIn ? "#6b6860" : "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: isLoggingIn ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isLoggingIn && (
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  ></div>
                )}
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div style={{ position: "relative", marginBottom: "20px" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ width: "100%", borderTop: "1px solid #e2e0d8" }}
                ></div>
              </div>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    padding: "0 16px",
                    background: "#ffffff",
                    fontSize: "14px",
                    color: "#6b6860",
                  }}
                >
                  OR
                </span>
              </div>
            </div>

            {/* Google Login */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="100%"
              />
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; }
        .nav-links a:hover { color: #1b1c1a !important; }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .nav-links { display: none; }
        }
      `}</style>
    </div>
  );
};

export default HowItWorksPage;
