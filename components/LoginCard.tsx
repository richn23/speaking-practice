"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthMode = "signin" | "signup";

export default function LoginCard() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");

  const flip = () => {
    setError(null);
    setMode((m) => (m === "signin" ? "signup" : "signin"));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    setLoading(false);
    if (err) {
      setError(err.message || "Invalid email or password");
      return;
    }
    router.push("/home");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (signUpPassword !== signUpConfirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message || "Could not create account");
      return;
    }
    setShowVerification(true);
    setMode("signin");
  };

  const cardStyle: React.CSSProperties = {
    position: "relative",
    width: "420px",
    height: "560px",
    transformStyle: "preserve-3d",
    transition: "transform 0.5s ease",
    transform: mode === "signup" ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  const faceStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
    background: "rgba(30, 30, 35, 0.8)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderTop: "2px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "8px",
    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.55)",
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "1rem",
    color: "#e5e7eb",
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(20, 20, 25, 0.8)",
    color: "#f3f4f6",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    padding: "0.85rem",
    width: "100%",
    outline: "none",
  };

  const inputFocusStyle: React.CSSProperties = {
    boxShadow: "0 0 0 3px rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.4)",
  };

  const buttonStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #f9fafb, #d5d7dc)",
    color: "#111827",
    border: "none",
    borderRadius: "6px",
    padding: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "filter 0.2s ease",
  };

  const subtleText: React.CSSProperties = { color: "#d1d5db", fontSize: "0.9rem" };
  const linkStyle: React.CSSProperties = { color: "#e5e7eb", cursor: "pointer", textDecoration: "underline" };

  return (
    <>
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 30px rgba(20, 20, 25, 1) inset !important;
          -webkit-text-fill-color: #e9e4f0 !important;
          caret-color: #e9e4f0 !important;
        }
      `}</style>
      <div
        style={{
          perspective: "1000px",
          width: "420px",
          height: "560px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={cardStyle}>
          {/* Sign In */}
          <div style={faceStyle}>
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                marginBottom: "2rem",
                fontFamily: "var(--font-heading, 'Orbitron', sans-serif)",
              }}
            >
              Welcome Back
            </h2>
            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <input
                style={{ ...inputStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
                type="email"
                placeholder="Email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                required
              />
              <input
                style={{ ...inputStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
                type="password"
                placeholder="Password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                required
              />
              {error && mode === "signin" && (
                <div style={{ color: "#f87171", fontSize: "0.9rem", marginTop: "-0.25rem" }}>{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ ...buttonStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
              >
                {loading && mode === "signin" ? "Signing in..." : "Sign In"}
              </button>
            </form>
            {showVerification && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                  borderRadius: 10,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  color: "#bbf7d0",
                  fontFamily: "var(--font-body, 'Exo 2', sans-serif)",
                }}
              >
                Account created! Check your email to verify, then sign in.
              </div>
            )}
            <div style={{ marginTop: "1rem" }}>
              <span style={subtleText}>New here? </span>
              <span onClick={flip} style={{ ...linkStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}>
                Create an account
              </span>
            </div>
          </div>

          {/* Sign Up */}
          <div style={{ ...faceStyle, transform: "rotateY(180deg)" }}>
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                marginBottom: "2rem",
                fontFamily: "var(--font-heading, 'Orbitron', sans-serif)",
              }}
            >
              Create Account
            </h2>
            <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <input
                style={{ ...inputStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                style={{ ...inputStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <input
                style={{ ...inputStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
                type="email"
                placeholder="Email"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                required
              />
              <input
                style={{ ...inputStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
                type="password"
                placeholder="Password"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                required
              />
              <input
                style={{ ...inputStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
                type="password"
                placeholder="Confirm password"
                value={signUpConfirm}
                onChange={(e) => setSignUpConfirm(e.target.value)}
                required
              />
              {error && mode === "signup" && (
                <div style={{ color: "#f87171", fontSize: "0.9rem", marginTop: "-0.25rem" }}>{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ ...buttonStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
              >
                {loading && mode === "signup" ? "Creating..." : "Create Account"}
              </button>
            </form>
            <div style={{ marginTop: "1rem" }}>
              <span style={subtleText}>Already have an account? </span>
              <span onClick={flip} style={{ ...linkStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}>
                Sign in
              </span>
            </div>
            {showVerification && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                  borderRadius: 10,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  color: "#bbf7d0",
                  fontFamily: "var(--font-body, 'Exo 2', sans-serif)",
                }}
              >
                Account created! Check your email to verify, then sign in.{" "}
                <span
                  onClick={() => setMode("signin")}
                  style={{ ...linkStyle, fontFamily: "var(--font-body, 'Exo 2', sans-serif)" }}
                >
                  Back to Sign In
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

