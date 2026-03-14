"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DIFFICULTY_STORAGE_KEY = "detective-game-difficulty";

const DIFFICULTY_OPTIONS = [
  { value: 3, label: "Легко (3 підозрюваних)" },
  { value: 5, label: "Середньо (5 підозрюваних)" },
  { value: 6, label: "Складно (6 підозрюваних, подвійний допит)" },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<3 | 5 | 6>(() => {
    if (typeof window === "undefined") return 3;
    const stored = window.sessionStorage.getItem(DIFFICULTY_STORAGE_KEY);
    const n = stored ? parseInt(stored, 10) : 3;
    return (n === 3 || n === 5 || n === 6) ? n : 3;
  });
  const [loading, setLoading] = useState(false);

  async function startNewGame() {
    setLoading(true);
    sessionStorage.setItem(DIFFICULTY_STORAGE_KEY, String(difficulty));
    try {
      const res = await fetch("/api/generate-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Не вдалося почати гру. Спробуйте ще раз.");
        return;
      }
      const caseId = data.caseId;
      if (caseId) {
        router.push(`/game?caseId=${caseId}&_=${Date.now()}`);
      } else {
        alert("Сервер не повернув ідентифікатор справи.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="block-gif">
      <div id="main" className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-[0.2em] text-[var(--noir-ink)] uppercase mb-1 md:mb-3 mt-12 md:mt-24">
          True Crime
        </h1>
        <div className="txt-block txt-block--gothic px-4">
          <p className="text-center">
            Тіні зберігають таємниці. Збирай докази, допитуй підозрюваних — у тебе лише одна спроба назвати вбивцю.
          </p>
        </div>

        <div className="home-difficulty">
          <p className="home-difficulty__label">Рівень складності</p>
          <div className="home-difficulty__options">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <label key={opt.value} className="home-difficulty__option">
                <input
                  type="radio"
                  name="difficulty"
                  value={opt.value}
                  checked={difficulty === opt.value}
                  onChange={() => setDifficulty(opt.value)}
                  className="home-difficulty__input"
                />
                <span className="home-difficulty__text">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="btn-block mt-4">
          <button
            type="button"
            className="btn-flip"
            data-front="Почати гру"
            data-back="Murder"
            aria-label="Почати гру"
            onClick={startNewGame}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
