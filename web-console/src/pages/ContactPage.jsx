import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Mail, Lock, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ContactPage = () => {
  const navigate = useNavigate();
  const [formSuccess, setFormSuccess] = useState(false);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, googleLogin, isAuthenticated } = useAuth();

  useEffect(() => {
    const storedData = localStorage.getItem("contactFormData");

    if (storedData) {
      try {
        const { topic: storedTopic, message: storedMessage } =
          JSON.parse(storedData);
        if (storedTopic) setTopic(storedTopic);
        if (storedMessage) setMessage(storedMessage);

        // Clear localStorage after reading to prevent stale data
        localStorage.removeItem("contactFormData");
      } catch (error) {
        console.error("Error parsing contact form data:", error);
      }
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSuccess(true);
    e.target.style.opacity = "0.4";
    e.target.style.pointerEvents = "none";
  };

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
        <div style={{ maxWidth: "768px", margin: "0 auto", padding: "0 32px" }}>
          {/* HEADER */}
          <div style={{ marginBottom: "56px" }}>
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
              Contact
            </div>
            <h1
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(48px, 5vw, 60px)",
                lineHeight: 1.05,
                marginBottom: "24px",
              }}
            >
              Let's talk.
            </h1>
            <p
              style={{
                fontSize: "18px",
                color: "#3d4943",
                lineHeight: 1.6,
                fontWeight: 300,
                maxWidth: "448px",
              }}
            >
              Whether you're evaluating invari for production, have a technical
              question, or want to explore enterprise options — we respond fast.
            </p>
          </div>

          {/* QUICK CONTACT CARDS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "56px",
            }}
          >
            <a
              href="mailto:enquiry@invari.ai"
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                border: "1px solid rgba(188, 202, 193, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              className="contact-card"
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  background: "#d4f0e7",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "20px",
                    color: "#1D9E75",
                    fontVariationSettings:
                      "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                    verticalAlign: "middle",
                  }}
                >
                  mail
                </span>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1b1c1a",
                    marginBottom: "2px",
                  }}
                >
                  Email us directly
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "#3d4943",
                  }}
                >
                  enquiry@invari.ai
                </div>
              </div>
            </a>
            <a
              href="https://github.com/arabindanarayandas/invari"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                border: "1px solid rgba(188, 202, 193, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              className="contact-card"
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  background: "#efeeeb",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1b1c1a">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1b1c1a",
                    marginBottom: "2px",
                  }}
                >
                  GitHub
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "#3d4943",
                  }}
                >
                  Open an issue
                </div>
              </div>
            </a>
          </div>

          {/* FORM */}
          <div
            style={{
              borderTop: "1px solid rgba(188, 202, 193, 0.3)",
              paddingTop: "56px",
            }}
          >
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
              Send a message
            </div>
            <h2
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(30px, 4vw, 36px)",
                marginBottom: "40px",
                lineHeight: 1.2,
              }}
            >
              Or fill in the form below.
            </h2>

            <form
              id="contact-form"
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      color: "#3d4943",
                      fontWeight: 600,
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    required
                    style={{
                      width: "100%",
                      background: "#ffffff",
                      border: "1px solid rgba(188, 202, 193, 0.6)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "#1b1c1a",
                      transition: "all 0.15s",
                    }}
                    className="form-input"
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      color: "#3d4943",
                      fontWeight: 600,
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    required
                    style={{
                      width: "100%",
                      background: "#ffffff",
                      border: "1px solid rgba(188, 202, 193, 0.6)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "#1b1c1a",
                      transition: "all 0.15s",
                    }}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: "#3d4943",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    border: "1px solid rgba(188, 202, 193, 0.6)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    color: "#1b1c1a",
                    transition: "all 0.15s",
                    appearance: "none",
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%233d4943' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 16px center",
                  }}
                  className="form-input"
                >
                  <option value="">Select a topic...</option>
                  <option>General question</option>
                  <option>Business Enquiry</option>
                  <option>Enterprise enquiry</option>
                  <option>Early access program</option>
                  <option>Technical support</option>
                  <option>Partnership</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: "#3d4943",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  rows="5"
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    border: "1px solid rgba(188, 202, 193, 0.6)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    color: "#1b1c1a",
                    transition: "all 0.15s",
                    resize: "vertical",
                    fontFamily: "'Manrope', sans-serif",
                  }}
                  className="form-input"
                ></textarea>
              </div>

              <button
                type="submit"
                style={{
                  background: "#1b1c1a",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "12px 28px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                  alignSelf: "flex-start",
                }}
              >
                Send message →
              </button>
            </form>

            {formSuccess && (
              <div
                style={{
                  display: "block",
                  background: "#d4f0e7",
                  border: "1px solid rgba(29, 158, 117, 0.3)",
                  borderRadius: "12px",
                  padding: "20px 24px",
                  marginTop: "24px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "20px",
                      color: "#1D9E75",
                      fontVariationSettings:
                        "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
                      verticalAlign: "middle",
                    }}
                  >
                    check_circle
                  </span>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#1D9E75",
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    Message received — we'll be back within one business day.
                  </p>
                </div>
              </div>
            )}
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
                href="mailto:founders@invari.ai"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "14px",
                  color: "#1D9E75",
                  textDecoration: "none",
                }}
              >
                founders@invari.ai
              </a>
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
        .contact-card:hover { border-color: rgba(27, 28, 26, 0.3) !important; box-shadow: 0 4px 16px rgba(27,28,26,0.06) !important; }
        .form-input:focus { outline: none; border-color: #1D9E75 !important; box-shadow: 0 0 0 3px rgba(29,158,117,0.1); }
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

export default ContactPage;
