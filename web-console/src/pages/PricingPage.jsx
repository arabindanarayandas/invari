import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Mail, Lock, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const PricingPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, googleLogin, isAuthenticated } = useAuth();

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const setBilling = (annual) => {
    setIsAnnual(annual);
  };

  const handleCardClick = (cardName) => {
    setSelectedCard(selectedCard === cardName ? null : cardName);
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

  const faqs = [
    {
      question: "Why is Pro only $29/mo?",
      answer:
        "Deliberately. We looked at what engineers pay for production infrastructure tools in the same budget conversation — $25–$49/mo. invari actively repairs requests, not just observes them — that's a higher-value proposition — but we're earlier and have less track record. At $29 we're the easy yes. We'll raise it as we earn that right.",
    },
    {
      question: "What's the difference between Open Source and Free Hosted?",
      answer:
        "Functionally identical — same repair engine, same dashboard, same features. The difference is who runs the server. With open source you deploy it yourself, manage uptime, handle updates. With Free Hosted we do all that. You also get commercial use rights on the hosted tier, which open source doesn't include.",
    },
    {
      question: "Can I use the open source version in a commercial product?",
      answer:
        "No. The open source version is licensed under the PolyForm Noncommercial License 1.0.0. If you're using invari in production for a commercial product, you need the Free Hosted tier or above. Free Hosted is still $0 — you just can't run it yourself.",
    },
    {
      question: "Is there a free trial for Pro?",
      answer:
        "The Free Hosted tier is essentially an unlimited free trial — it's the full product, just capped at 1 agent and 50k requests/month. If that's not enough to evaluate, reach out and we'll set up a temporary Pro account. We'd rather have you properly evaluate than not try at all.",
    },
    {
      question: "What happens when I hit 50,000 requests on Free Hosted?",
      answer:
        "We'll notify you before you hit the limit. Requests won't be dropped — invari keeps repairing. We'll ask you to upgrade or we'll discuss what makes sense. We're not going to silently break your production system over a billing threshold.",
    },
    {
      question: "Do you offer discounts for startups or nonprofits?",
      answer:
        "Yes. If you're pre-seed, early-stage (under $1M raised), or a registered nonprofit, get in touch. We'd rather have you using invari than not. Open source is always an option too.",
    },
  ];

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
          style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 32px" }}
        >
          {/* HEADER */}
          <div style={{ marginBottom: "64px", maxWidth: "800px" }}>
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
              Pricing
            </div>
            <h1
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(48px, 5vw, 60px)",
                lineHeight: 1.05,
                marginBottom: "24px",
              }}
            >
              Start free.
              <br />
              <span style={{ fontStyle: "italic", fontWeight: 400 }}>
                Scale when ready.
              </span>
            </h1>
            <p
              style={{
                fontSize: "18px",
                color: "#3d4943",
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              invari is source-available and free to self-host for
              non-commercial use. Commercial plans start at $0.
            </p>
          </div>

          {/* BILLING TOGGLE */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "48px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                color: isAnnual ? "#3d4943" : "#1b1c1a",
                cursor: "pointer",
                fontWeight: isAnnual ? 400 : 500,
              }}
              onClick={() => setBilling(false)}
            >
              Monthly
            </span>
            <div
              style={{
                position: "relative",
                width: "44px",
                height: "24px",
                cursor: "pointer",
              }}
              onClick={() => setBilling(!isAnnual)}
            >
              <div
                style={{
                  width: "44px",
                  height: "24px",
                  background: isAnnual ? "#1D9E75" : "#bccac1",
                  borderRadius: "999px",
                  transition: "background 0.2s",
                }}
              ></div>
              <div
                style={{
                  position: "absolute",
                  top: "4px",
                  left: "4px",
                  width: "16px",
                  height: "16px",
                  background: "white",
                  borderRadius: "999px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "transform 0.2s",
                  transform: isAnnual ? "translateX(20px)" : "translateX(0)",
                }}
              ></div>
            </div>
            <span
              style={{
                fontSize: "14px",
                color: isAnnual ? "#1b1c1a" : "#3d4943",
                cursor: "pointer",
                fontWeight: isAnnual ? 500 : 400,
              }}
              onClick={() => setBilling(true)}
            >
              Annual
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                background: "#d4f0e7",
                color: "#1D9E75",
                padding: "4px 12px",
                borderRadius: "2px",
                fontWeight: 600,
              }}
            >
              Save 25%
            </span>
          </div>

          {/* PLANS GRID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            {/* Open Source */}
            <div
              onClick={() => handleCardClick("opensource")}
              className="pricing-card"
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "28px",
                border:
                  selectedCard === "opensource"
                    ? "2px solid #1D9E75"
                    : "1px solid rgba(188, 202, 193, 0.3)",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow:
                  selectedCard === "opensource"
                    ? "0 8px 24px rgba(29, 158, 117, 0.15)"
                    : "0 1px 3px rgba(0,0,0,0.05)",
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
                Open Source
              </div>
              <div
                style={{
                  fontFamily: "'Noto Serif', serif",
                  fontSize: "36px",
                  marginBottom: "4px",
                }}
              >
                Free
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  color: "#3d4943",
                  marginBottom: "4px",
                }}
              >
                self-hosted
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#3d4943",
                  marginBottom: "24px",
                  lineHeight: 1.6,
                  marginTop: "12px",
                }}
              >
                Run it yourself. Full source available. Non-commercial use only.
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(188, 202, 193, 0.3)",
                  paddingTop: "20px",
                  marginBottom: "24px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Unlimited requests (self-hosted)
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  All repair types
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Full source code
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: "#3d4943", marginTop: "2px" }}>–</span>{" "}
                  <span style={{ color: "#3d4943" }}>Commercial use</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: "#3d4943", marginTop: "2px" }}>–</span>{" "}
                  <span style={{ color: "#3d4943" }}>Managed hosting</span>
                </div>
              </div>
              <Link
                to="/contact"
                className="pricing-button"
                onClick={(e) => {
                  e.stopPropagation();
                  localStorage.setItem(
                    "contactFormData",
                    JSON.stringify({
                      topic: "Enterprise enquiry",
                      message: "I want to enquire about Open Source plan",
                    }),
                  );
                }}
                style={{
                  display: "block",
                  textAlign: "center",
                  border: "1px solid #bccac1",
                  color: "#1b1c1a",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                Get started
              </Link>
            </div>

            {/* Free Hosted */}
            <div
              onClick={() => handleCardClick("freehosted")}
              className="pricing-card"
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "28px",
                border:
                  selectedCard === "freehosted"
                    ? "2px solid #1D9E75"
                    : "1px solid rgba(188, 202, 193, 0.3)",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow:
                  selectedCard === "freehosted"
                    ? "0 8px 24px rgba(29, 158, 117, 0.15)"
                    : "0 1px 3px rgba(0,0,0,0.05)",
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
                Free Hosted
              </div>
              <div
                style={{
                  fontFamily: "'Noto Serif', serif",
                  fontSize: "36px",
                  marginBottom: "4px",
                }}
              >
                $0
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  color: "#3d4943",
                  marginBottom: "4px",
                }}
              >
                /month forever
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#3d4943",
                  marginBottom: "24px",
                  lineHeight: 1.6,
                  marginTop: "12px",
                }}
              >
                We host it. You get commercial use rights and never touch a
                server.
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(188, 202, 193, 0.3)",
                  paddingTop: "20px",
                  marginBottom: "24px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  50,000 requests/month
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  1 agent
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Commercial use
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Dashboard + logs
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ color: "#3d4943", marginTop: "2px" }}>–</span>{" "}
                  <span style={{ color: "#3d4943" }}>Email support</span>
                </div>
              </div>
              <Link
                to="/contact"
                className="pricing-button"
                onClick={(e) => {
                  e.stopPropagation();
                  localStorage.setItem(
                    "contactFormData",
                    JSON.stringify({
                      topic: "Enterprise enquiry",
                      message: "I want to enquire about Free Hosted plan",
                    }),
                  );
                }}
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "#ffffff",
                  border: "1px solid #bccac1",
                  color: "#1b1c1a",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                Get started free
              </Link>
            </div>

            {/* Pro — FEATURED */}
            <div
              onClick={() => handleCardClick("pro")}
              className="pricing-card pricing-card-pro"
              style={{
                background: "#1b1c1a",
                borderRadius: "12px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.2s ease",
                border:
                  selectedCard === "pro"
                    ? "2px solid #1D9E75"
                    : "2px solid transparent",
                boxShadow:
                  selectedCard === "pro"
                    ? "0 12px 32px rgba(29, 158, 117, 0.3)"
                    : "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "96px",
                  height: "96px",
                  background: "rgba(29, 158, 117, 0.1)",
                  borderRadius: "999px",
                  filter: "blur(32px)",
                  pointerEvents: "none",
                }}
              ></div>
              <div
                style={{
                  position: "absolute",
                  top: "-1px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#1D9E75",
                  color: "white",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  padding: "4px 16px",
                  borderBottomLeftRadius: "6px",
                  borderBottomRightRadius: "6px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                Most popular
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: "#1D9E75",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: "16px",
                  marginTop: "8px",
                }}
              >
                Pro
              </div>
              <div
                style={{
                  fontFamily: "'Noto Serif', serif",
                  fontSize: "36px",
                  color: "white",
                  marginBottom: "4px",
                }}
              >
                <span>{isAnnual ? "$29" : "$39"}</span>
                <span
                  style={{
                    fontSize: "20px",
                    fontFamily: "'Manrope', sans-serif",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  /mo
                </span>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: "4px",
                }}
              >
                {isAnnual ? "billed annually · $348/yr" : "billed monthly"}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: "24px",
                  lineHeight: 1.6,
                  marginTop: "12px",
                }}
              >
                Production infrastructure. Everything you need to ship
                confidently.
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  paddingTop: "20px",
                  marginBottom: "24px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  1M requests/month
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Unlimited agents
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  90-day log retention
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Up to 5 team members
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Email support (4hr)
                </div>
              </div>
              <Link
                to="/contact"
                className="pricing-button pricing-button-pro"
                onClick={(e) => {
                  e.stopPropagation();
                  localStorage.setItem(
                    "contactFormData",
                    JSON.stringify({
                      topic: "Enterprise enquiry",
                      message: "I want to enquire about Pro plan",
                    }),
                  );
                }}
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "#1D9E75",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                Get started
              </Link>
            </div>

            {/* Enterprise */}
            <div
              onClick={() => handleCardClick("enterprise")}
              className="pricing-card"
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "28px",
                border:
                  selectedCard === "enterprise"
                    ? "2px solid #1D9E75"
                    : "1px solid rgba(188, 202, 193, 0.3)",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow:
                  selectedCard === "enterprise"
                    ? "0 8px 24px rgba(29, 158, 117, 0.15)"
                    : "0 1px 3px rgba(0,0,0,0.05)",
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
                Enterprise
              </div>
              <div
                style={{
                  fontFamily: "'Noto Serif', serif",
                  fontSize: "36px",
                  marginBottom: "4px",
                }}
              >
                Custom
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  color: "#3d4943",
                  marginBottom: "4px",
                }}
              >
                volume pricing
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#3d4943",
                  marginBottom: "24px",
                  lineHeight: 1.6,
                  marginTop: "12px",
                }}
              >
                On-premise or managed. Custom rules. Dedicated support and SLA.
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(188, 202, 193, 0.3)",
                  paddingTop: "20px",
                  marginBottom: "24px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Unlimited requests
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  VPC / on-premise
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Custom repair rules
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  SSO (SAML / Okta)
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "14px",
                  }}
                >
                  <span
                    style={{
                      color: "#1D9E75",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    ✓
                  </span>{" "}
                  Dedicated Slack + SLA
                </div>
              </div>
              <Link
                to="/contact"
                className="pricing-button"
                onClick={(e) => {
                  e.stopPropagation();
                  localStorage.setItem(
                    "contactFormData",
                    JSON.stringify({
                      topic: "Enterprise enquiry",
                      message: "I want to enquire about Enterprise plan",
                    }),
                  );
                }}
                style={{
                  display: "block",
                  textAlign: "center",
                  border: "1px solid #bccac1",
                  color: "#1b1c1a",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                Contact us
              </Link>
            </div>
          </div>

          {/* CONTEXT NOTE */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid rgba(188, 202, 193, 0.2)",
              marginBottom: "64px",
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontSize: "18px",
                color: "#1D9E75",
                marginTop: "2px",
                flexShrink: 0,
              }}
            >
              ℹ
            </span>
            <p style={{ fontSize: "14px", color: "#3d4943", lineHeight: 1.6 }}>
              <strong style={{ color: "#1b1c1a" }}>
                We're in early access.
              </strong>{" "}
              Pro pricing is deliberately set to be the easy yes. We looked at
              what engineers pay for production infrastructure tools in the same
              budget conversation — $25–$49/mo. invari actively repairs
              requests, not just observes them. At $29 we're earning the right
              to charge more. We'll raise it as we do.
            </p>
          </div>

          {/* FAQ */}
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
              FAQ
            </div>
            <h2
              style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: "clamp(30px, 4vw, 36px)",
                marginBottom: "40px",
                lineHeight: 1.2,
              }}
            >
              Common questions.
            </h2>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                borderTop: "1px solid rgba(188, 202, 193, 0.3)",
              }}
            >
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  style={{
                    padding: "20px 0",
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(188, 202, 193, 0.3)",
                  }}
                  onClick={() => toggleFaq(index)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div style={{ fontSize: "16px", fontWeight: 600 }}>
                      {faq.question}
                    </div>
                    <i
                      style={{
                        color: "#3d4943",
                        fontSize: "14px",
                        marginTop: "4px",
                        transition: "transform 0.2s",
                        transform:
                          openFaq === index ? "rotate(90deg)" : "rotate(0deg)",
                        display: "inline-block",
                      }}
                    >
                      ▶
                    </i>
                  </div>
                  {openFaq === index && (
                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "14px",
                        color: "#3d4943",
                        lineHeight: 1.6,
                      }}
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
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
                Still unsure? Talk to us.
              </h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>
                We'll help you figure out the right plan — or whether you even
                need one yet.
              </p>
            </div>
            <Link
              to="/contact"
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
              Get in touch
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
        .nav-links a:hover { color: #1b1c1a !important; }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .nav-links { display: none; }
        }

        /* Pricing Card Hover Effects */
        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12) !important;
        }

        .pricing-card-pro:hover {
          box-shadow: 0 16px 40px rgba(29, 158, 117, 0.25) !important;
        }

        /* Smooth transition for all interactive elements */
        .pricing-card {
          will-change: transform, box-shadow;
        }

        /* Pricing Button Hover Effects */
        .pricing-button {
          will-change: transform, box-shadow;
        }

        .pricing-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
        }

        .pricing-button-pro:hover {
          box-shadow: 0 6px 20px rgba(29, 158, 117, 0.4) !important;
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
