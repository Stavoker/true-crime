"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCasePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const difficulty = (() => {
        if (typeof window === "undefined") return 3;
        const stored = window.sessionStorage.getItem("detective-game-difficulty");
        const n = stored ? parseInt(stored, 10) : 3;
        return (n === 3 || n === 5 || n === 6) ? n : 3;
      })();

      try {
        const res = await fetch("/api/generate-case", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ difficulty }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Не вдалося створити нову справу. Спробуйте ще раз.");
          return;
        }
        const caseId = data.caseId;
        if (caseId) {
          router.replace(`/game?caseId=${caseId}&_=${Date.now()}`);
        } else {
          setError("Сервер не повернув ідентифікатор справи.");
        }
      } catch {
        setError("Помилка мережі. Перевірте підключення та спробуйте знову.");
      }
    })();
  }, [router]);

  if (error) {
    return (
      <div className="block-gif min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-white text-center">{error}</p>
        <a href="/" className="text-yellow-400 hover:underline">
          На головну
        </a>
      </div>
    );
  }

  return (
    <div className="block-gif min-h-screen flex items-center justify-center">
      <p className="text-white">Завантаження нової справи...</p>
    </div>
  );
}
