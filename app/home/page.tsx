"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MatrixBackground from "@/components/MatrixBackground";
import LevelCard from "@/components/LevelCard";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const levels = [
  { id: "beginner", name: "Beginner", cefr: "A1", color: "#3b82f6", unlocked: false },
  { id: "elementary", name: "Elementary", cefr: "A2", color: "#9f1239", unlocked: false },
  { id: "pre-int", name: "Pre-Intermediate", cefr: "A2+", color: "#7c3aed", unlocked: true, route: "/unit/1" },
  { id: "intermediate", name: "Intermediate", cefr: "B1", color: "#f97316", unlocked: false },
  { id: "upper-int", name: "Upper-Intermediate", cefr: "B2", color: "#22c55e", unlocked: false },
  { id: "advanced", name: "Advanced", cefr: "C1/C2", color: "#06b6d4", unlocked: false },
];

const rotations = [-12, -7, -2, 2, 7, 12];

export default function HomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>("there");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const user = data.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      const name = (user.user_metadata as any)?.first_name || "there";
      setFirstName(name);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleCardClick = (levelId: string) => {
    const target = levels.find((l) => l.id === levelId);
    if (target?.unlocked && target.route) {
      router.push(target.route);
    }
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#08080c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e5e7eb",
        }}
      >
        Loading...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <MatrixBackground colorScheme="grey" speedScale={0.7} />
      <header
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.5rem 2rem",
          color: "#e5e7eb",
        }}
      >
        <div style={{ fontSize: "1.1rem", fontFamily: "var(--font-heading, 'Orbitron', sans-serif)" }}>
          Hi, {firstName}!
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "linear-gradient(135deg, #f3f4f6, #d1d5db)",
            color: "#111827",
            border: "none",
            borderRadius: 10,
            padding: "0.6rem 1.1rem",
            fontWeight: 600,
            fontFamily: "var(--font-body, 'Exo 2', sans-serif)",
            cursor: "pointer",
            transition: "filter 0.2s ease",
          }}
        >
          Logout
        </button>
      </header>

      <section
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "960px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {levels.map((level) => (
            <LevelCard key={level.id} level={level} onClick={() => handleCardClick(level.id)} highlight={level.id === "pre-int"} />
          ))}
        </div>
      </section>
    </main>
  );
}

