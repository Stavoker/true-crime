"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import MusicToggle from "@/components/MusicToggle";
import type { Case } from "@/types/database";

type SuspectWithTestimony = {
  id: string;
  name: string;
  surname: string;
  gender: string;
  age: number;
  job: string;
  hobby: string;
  bad_habit: string;
  foot_size: number;
  hair_color: string;
  biography: string;
  image_url: string | null;
};

/** Фото за статтю та віком: чоловік <50 → img1, чоловік ≥50 → img2, жінка <50 → img3, жінка ≥50 → img4 */
function getPlaceholderImage(s: { gender: string; age: number }): string {
  const isMale = s.gender === "male";
  const old = s.age >= 50;
  if (isMale && !old) return "/img1.jpg";
  if (isMale && old) return "/img2.jpg";
  if (!isMale && !old) return "/img3.jpg";
  return "/img4.jpg";
}

export default function GamePage() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId");
  const [gameCase, setGameCase] = useState<Case | null>(null);
  const [suspects, setSuspects] = useState<SuspectWithTestimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [accuseOpen, setAccuseOpen] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [confession, setConfession] = useState<string | null>(null);
  const [motive, setMotive] = useState<string | null>(null);
  const [wrongMessage, setWrongMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;
    const supabase = createClient();
    (async () => {
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("*")
        .eq("id", caseId)
        .single();
      if (caseError || !caseData) {
        setLoading(false);
        return;
      }
      setGameCase(caseData as Case);

      const { data: caseSuspects } = (await supabase
        .from("case_suspects")
        .select("suspect_id")
        .eq("case_id", caseId)) as { data: { suspect_id: string }[] | null };
      if (!caseSuspects?.length) {
        setLoading(false);
        return;
      }

      const suspectIds = caseSuspects.map((cs) => cs.suspect_id);
      const { data: suspectsData } = await supabase
        .from("suspects")
        .select("*")
        .in("id", suspectIds);
      setSuspects((suspectsData as SuspectWithTestimony[]) || []);
      setLoading(false);
    })();
  }, [caseId]);

  function accuse(suspectId: string) {
    if (!gameCase || result !== null) return;
    setAccuseOpen(false);
    if (suspectId === gameCase.killer_id) {
      setResult("correct");
      setConfession(gameCase.confession_text);
      setMotive(gameCase.motive);
    } else {
      setResult("wrong");
      const messages = [
        "Вбивця сміється з іншого кінця міста. Твоя кар'єра детектива пішла під схил. Наступного разу краще збирай докази!",
        "Ні. Замість тебе на наступну справу посилають того хлопця з кафе, що завжди плутає замовлення. Так, того самого.",
        "Помилка. Вбивця вже виїхав у теплі краї під чужим ім'ям. А ти залишаєшся тут з цим обличчям.",
        "Поліція закрила справу через «відсутність прогресу». Журналісти вже пишуть статті про «детектива, який не вміє читати сліди».",
      ];
      setWrongMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
  }

  if (loading) {
    return (
      <div className="block-gif min-h-screen flex items-center justify-center">
        <p className="text-white">Завантаження справи...</p>
      </div>
    );
  }
  if (!caseId || !gameCase) {
    return (
      <div className="block-gif min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white">Справу не знайдено.</p>
        <Link href="/" className="text-yellow-400 hover:underline">
          На головну
        </Link>
      </div>
    );
  }

  const parts = [
    gameCase.intro_text,
    gameCase.body_location,
    `Експертиза встановила: ${gameCase.tool_description}`,
    `На місці знайдено: ${gameCase.evidence_description}`,
  ].filter(Boolean);

  const fullStory = parts
    .map((p) => p.replace(/\.+\s*$/, "").trim())
    .join(". ")
    .replace(/;\s*/g, ". ")
    .replace(/\.{2,}/g, ".");

  return (
    <div className="block-gif game-page">
      <MusicToggle />
      <div className="game-suspect-count" aria-live="polite">
        Підозрюваних: {suspects.length}
      </div>

      <main className="game-layout">
        <section className="game-layout__story">
          <p>{fullStory}</p>
        </section>

        <section
          className={`game-layout__cards${suspects.length > 3 ? " game-layout__cards--scroll-visible" : ""}`}
          aria-label="Підозрювані"
        >
          <div className="game-layout__cards-inner">
            {suspects.map((s) => (
              <Link
                key={s.id}
                href={`/game/suspect/${s.id}?caseId=${caseId}`}
                className="game-card"
              >
                <ul className="game-card__list">
                  <li className="game-card__item game-card__item--name">
                    <span className="game-card__label">Name:</span>{" "}
                    <span className="game-card__value">{s.name} {s.surname}</span>
                  </li>
                  <li className="game-card__item"><span className="game-card__label">Age:</span> <span className="game-card__value">{s.age}</span></li>
                  <li className="game-card__item"><span className="game-card__label">Job:</span> <span className="game-card__value">{s.job}</span></li>
                  <li className="game-card__item"><span className="game-card__label">Bad Habits:</span> <span className="game-card__value">{s.bad_habit}</span></li>
                  <li className="game-card__item"><span className="game-card__label">Foot Size:</span> <span className="game-card__value">{s.foot_size}</span></li>
                  <li className="game-card__item"><span className="game-card__label">Hobby:</span> <span className="game-card__value">{s.hobby}</span></li>
                  <li className="game-card__item"><span className="game-card__label">Hair:</span> <span className="game-card__value">{s.hair_color}</span></li>
                </ul>
                <img
                  className="game-card__img"
                  src={getPlaceholderImage(s)}
                  alt=""
                />
              </Link>
            ))}
          </div>
        </section>

        {result === null && (
          <nav className="game-layout__actions">
            <button
              type="button"
              onClick={() => setAccuseOpen(true)}
              className="btn-flip"
              data-front="Звинуватити"
              data-back="Accuse"
              aria-label="Звинуватити"
            />
            <Link
              href="/game/new"
              className="btn-flip"
              data-front="Нова справа"
              data-back="Murder"
              aria-label="Нова справа"
            />
          </nav>
        )}
      </main>

      {accuseOpen && result === null && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <h3>Кого звинувачуєте?</h3>
            <p className="text-[#dadada] text-sm mb-4">У вас лише одна спроба.</p>
            <ul className="space-y-2">
              {suspects.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => accuse(s.id)}
                    className="w-full text-left py-2 px-3 rounded bg-[#2a2928] hover:bg-[#3d3c3b] text-white"
                  >
                    {s.name} {s.surname}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setAccuseOpen(false)}
              className="mt-4 w-full py-2 text-[#999] hover:text-white"
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {result === "correct" && confession && motive && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg">
            <h3 className="text-yellow-400">Справа розкрита</h3>
            <p className="text-[#dadada] text-sm mb-2">Зізнання вбивці:</p>
            <p className="text-white mb-4 italic">&quot;{confession}&quot;</p>
            <p className="text-[#999] text-sm mb-4">Мотив: {motive}</p>
            <Link
              href="/game/new"
              className="btn-flip inline-block"
              data-front="Нова гра"
              data-back="Murder"
              aria-label="Нова гра"
            />
          </div>
        </div>
      )}

      {result === "wrong" && wrongMessage && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg">
            <h3 className="text-[#e01e1e]">Невірно</h3>
            <p className="text-[#dadada] mb-6">{wrongMessage}</p>
            <Link
              href="/game/new"
              className="btn-flip inline-block"
              data-front="Спробувати ще раз"
              data-back="Murder"
              aria-label="Спробувати ще раз"
            />
          </div>
        </div>
      )}
    </div>
  );
}
