"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Case } from "@/types/database";

const STORY_MODAL_SEEN_KEY = "detective-game-story-modal-seen-";
const CLUES_STORAGE_KEY = "detective-game-clues-";
const MAX_CLUES = 6;
const MAX_WORDS_PER_CLUE = 10;
const CLUE_DISPLAY_CHARS = 36;

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

const TIMER_STORAGE_PREFIX = "detective-game-timer-";
const CASE_STORY_TYPED_KEY = "detective-game-story-typed-";
const STORY_TYPEWRITER_MS_PER_CHAR = 24;

/** Ліміт часу в секундах: легко 3 хв, середньо 5 хв, складно 8 хв */
function getTimeLimitSeconds(difficulty: number): number {
  if (difficulty === 3) return 180;
  if (difficulty === 5) return 300;
  if (difficulty === 6) return 480;
  return 180;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Обрізати текст до max слів */
function trimToWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

/** Розбити видимий текст на сегменти для підсвітки зачіпок */
function getStorySegments(
  visibleText: string,
  clueList: string[]
): { type: "text" | "highlight"; text: string }[] {
  const segments: { type: "text" | "highlight"; text: string }[] = [];
  let remaining = visibleText;
  while (remaining.length > 0) {
    let earliest = remaining.length;
    let whichClue = -1;
    for (let i = 0; i < clueList.length; i++) {
      const idx = remaining.indexOf(clueList[i]);
      if (idx >= 0 && idx < earliest) {
        earliest = idx;
        whichClue = i;
      }
    }
    if (whichClue < 0) {
      segments.push({ type: "text", text: remaining });
      break;
    }
    if (earliest > 0) {
      segments.push({ type: "text", text: remaining.slice(0, earliest) });
    }
    segments.push({ type: "highlight", text: clueList[whichClue] });
    remaining = remaining.slice(earliest + clueList[whichClue].length);
  }
  return segments;
}

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
  const [result, setResult] = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [confession, setConfession] = useState<string | null>(null);
  const [motive, setMotive] = useState<string | null>(null);
  const [wrongMessage, setWrongMessage] = useState<string | null>(null);
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [storyTypedLength, setStoryTypedLength] = useState(0);
  const [storyTypewriterDone, setStoryTypewriterDone] = useState(false);
  const storyTypewriterStarted = useRef(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [clues, setClues] = useState<string[]>([]);
  const [viewCluesModalOpen, setViewCluesModalOpen] = useState(false);
  const storyModalContentRef = useRef<HTMLDivElement>(null);

  const updateScrollArrows = useCallback(() => {
    const el = cardsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = cardsScrollRef.current;
    const t = setTimeout(updateScrollArrows, 50);
    if (!el) return () => clearTimeout(t);
    el.addEventListener("scroll", updateScrollArrows);
    const ro = new ResizeObserver(updateScrollArrows);
    ro.observe(el);
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", updateScrollArrows);
      ro.disconnect();
    };
  }, [suspects.length, updateScrollArrows]);

  function scrollCards(direction: "left" | "right") {
    const el = cardsScrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  }

  function closeStoryModal() {
    if (caseId && typeof window !== "undefined") {
      sessionStorage.setItem(STORY_MODAL_SEEN_KEY + caseId, "1");
    }
    setStoryModalOpen(false);
  }

  function addClueFromSelection() {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    const text = sel?.toString?.()?.trim();
    if (!text || clues.length >= MAX_CLUES) return;
    const trimmed = trimToWords(text, MAX_WORDS_PER_CLUE);
    if (!trimmed) return;
    if (clues.some((c) => c === trimmed)) return;
    setClues((prev) => [...prev, trimmed].slice(0, MAX_CLUES));
    sel?.removeAllRanges?.();
  }

  // Відкрити модалку справи при першому заході на справу; завантажити зачіпки з sessionStorage
  useEffect(() => {
    if (!caseId || typeof window === "undefined") return;
    const seen = sessionStorage.getItem(STORY_MODAL_SEEN_KEY + caseId);
    if (!seen) setStoryModalOpen(true);
    try {
      const raw = sessionStorage.getItem(CLUES_STORAGE_KEY + caseId);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setClues(parsed.slice(0, MAX_CLUES));
      }
    } catch {
      // ignore
    }
  }, [caseId]);

  useEffect(() => {
    if (!caseId || typeof window === "undefined") return;
    sessionStorage.setItem(CLUES_STORAGE_KEY + caseId, JSON.stringify(clues));
  }, [caseId, clues]);

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

  // Анімація друку тексту справи при першому заході на сторінку (за сесію)
  useEffect(() => {
    if (!gameCase || !caseId) return;
    storyTypewriterStarted.current = false;
    const parts = [
      gameCase.intro_text,
      gameCase.body_location,
      gameCase.tool_description,
      gameCase.evidence_description,
    ].filter(Boolean);
    const full = parts.map((p) => p.trim()).join("\n\n");
    const key = CASE_STORY_TYPED_KEY + caseId;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(key) === "1") {
      setStoryTypedLength(full.length);
      setStoryTypewriterDone(true);
      return;
    }
    if (storyTypewriterStarted.current) return;
    storyTypewriterStarted.current = true;
    setStoryTypedLength(0);
    setStoryTypewriterDone(false);
    const fullLen = full.length;
    if (fullLen === 0) {
      setStoryTypewriterDone(true);
      if (typeof window !== "undefined") window.sessionStorage.setItem(key, "1");
      return;
    }
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setStoryTypedLength(n);
      if (n >= fullLen) {
        clearInterval(timer);
        setStoryTypewriterDone(true);
        if (typeof window !== "undefined") window.sessionStorage.setItem(key, "1");
      }
    }, STORY_TYPEWRITER_MS_PER_CHAR);
    return () => clearInterval(timer);
  }, [gameCase, caseId]);

  // Таймер: старт при завантаженні справи, збереження прогресу по caseId
  useEffect(() => {
    if (!caseId || !gameCase || result !== null) return;
    const limit = getTimeLimitSeconds(gameCase.difficulty);
    const key = TIMER_STORAGE_PREFIX + caseId;
    let startedAt: number;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        startedAt = parseInt(stored, 10);
        if (Number.isNaN(startedAt)) startedAt = Date.now();
      } else {
        startedAt = Date.now();
        sessionStorage.setItem(key, String(startedAt));
      }
    } catch {
      startedAt = Date.now();
    }
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const remaining = Math.max(0, limit - elapsed);
    setTimeLeft(remaining);
    if (remaining <= 0) {
      setResult("timeout");
      setTimeLeft(0);
      return;
    }
    const tick = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(tick);
          setResult("timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [caseId, gameCase?.id, gameCase?.difficulty, result]);

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

  const storyParagraphs = gameCase
    ? [
        gameCase.intro_text,
        gameCase.body_location,
        gameCase.tool_description,
        gameCase.evidence_description,
      ].filter(Boolean)
    : [];
  const fullStory = storyParagraphs.map((p) => String(p).trim()).join("\n\n");
  const visibleStory = fullStory.slice(0, storyTypedLength);
  const storySegments = getStorySegments(visibleStory, clues);

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

  return (
    <div className="block-gif game-page">
      {storyModalOpen && (
        <div className="story-modal-overlay" role="dialog" aria-labelledby="story-modal-title">
          <div className="story-modal-box" ref={storyModalContentRef}>
            <h2 id="story-modal-title" className="story-modal-title">
              СПРАВА
            </h2>
            <div
              className="story-modal-scroll"
              onMouseUp={addClueFromSelection}
              role="article"
            >
              <div className="story-modal-body white-space-pre-line">
                {storySegments.map((seg, i) =>
                  seg.type === "text" ? (
                    <Fragment key={i}>{seg.text}</Fragment>
                  ) : (
                    <mark key={i} className="story-clue-highlight">
                      {seg.text}
                    </mark>
                  )
                )}
                {!storyTypewriterDone && (
                  <span className="game-story-typewriter-cursor" aria-hidden="true" />
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={closeStoryModal}
              className="story-modal-close"
            >
              Закрити
            </button>
          </div>
        </div>
      )}

      {viewCluesModalOpen && (
        <div className="story-modal-overlay" role="dialog" aria-label="Перегляд зачіпок">
          <div className="view-clues-modal-box">
            <h2 className="story-modal-title">Зачіпки</h2>
            <ul className="view-clues-list">
              {clues.map((clue, i) => (
                <li key={i}>
                  <span className="view-clue-item" title={clue}>
                    {clue}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setViewCluesModalOpen(false)}
              className="story-modal-close"
            >
              Закрити
            </button>
          </div>
        </div>
      )}

      <div className="game-header-row">
        <div className="game-header-left">
          <div className="game-suspect-count" aria-live="polite">
            Підозрюваних: {suspects.length}
          </div>
          <button
            type="button"
            onClick={() => setStoryModalOpen(true)}
            className="game-btn-sprava"
            aria-label="Відкрити текст справи"
          >
            Справа
          </button>
        </div>
        {timeLeft !== null && result === null && (
          <div className="game-timer" aria-live="polite">
            Залишилось: {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <main className="game-layout">
        <section className="game-clues-block" aria-label="Зачіпки">
          <div className="game-clues-inner">
            {clues.length === 0 ? (
              <p className="game-clues-placeholder">
                Виділіть фрази в тексті справи (кнопка «Справа»), щоб додати зачіпки. Макс. 6 зачіпок, до 10 слів у кожній.
              </p>
            ) : (
              clues.map((clue, i) => (
                <button
                  key={`${i}-${clue.slice(0, 8)}`}
                  type="button"
                  onClick={() => setViewCluesModalOpen(true)}
                  className="game-clue-chip"
                >
                  {clue.length > CLUE_DISPLAY_CHARS ? clue.slice(0, CLUE_DISPLAY_CHARS) + "…" : clue}
                </button>
              ))
            )}
          </div>
        </section>

        <div className="game-layout__cards-wrap">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollCards("left")}
              className="game-layout__cards-arrow game-layout__cards-arrow--left"
              aria-label="Прокрутити вліво"
            >
              <span className="game-layout__cards-arrow-triangle" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollCards("right")}
              className="game-layout__cards-arrow game-layout__cards-arrow--right"
              aria-label="Прокрутити вправо"
            >
              <span className="game-layout__cards-arrow-triangle" />
            </button>
          )}
          <section
            ref={cardsScrollRef}
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
        </div>

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

      {result === "timeout" && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg">
            <h3 className="text-[#e01e1e]">Час вийшов</h3>
            <p className="text-[#dadada] mb-6">
              Ви не встигли звинуватити підозрюваного. Вбивця залишився на волі.
            </p>
            <Link
              href="/game/new"
              className="btn-flip inline-block"
              data-front="Нова справа"
              data-back="Murder"
              aria-label="Нова справа"
            />
          </div>
        </div>
      )}
    </div>
  );
}
