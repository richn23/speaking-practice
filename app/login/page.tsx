"use client";

import MatrixBackground from "@/components/MatrixBackground";
import LoginCard from "@/components/LoginCard";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "2rem",
      }}
    >
      <MatrixBackground colorScheme="grey" />
      <div
        style={{
          position: "relative",
          zIndex: 1,
        }}
      >
        <LoginCard />
      </div>
    </main>
  );
}

