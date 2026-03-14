"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Suspect } from "@/types/database";

const RESUME_TYPED_KEY = "resume-typed-";
const TYPEWRITER_MS_PER_CHAR = 28;
const TIMER_STORAGE_PREFIX = "detective-game-timer-";

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

function getPlaceholderImage(s: { gender: string; age: number }): string {
  const isMale = s.gender === "male";
  const old = s.age >= 50;
  if (isMale && !old) return "/img1.jpg";
  if (isMale && old) return "/img2.jpg";
  if (!isMale && !old) return "/img3.jpg";
  return "/img4.jpg";
}

export default function SuspectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const suspectId = params.id as string;
  const caseId = searchParams.get("caseId");

  const [suspect, setSuspect] = useState<Suspect | null>(null);
  const [testimony, setTestimony] = useState<string | null>(null);
  const [testimony2, setTestimony2] = useState<string | null>(null);
  const [caseDifficulty, setCaseDifficulty] = useState<number | null>(null);
  const [showTestimony, setShowTestimony] = useState(false);
  const [showSecondTestimony, setShowSecondTestimony] = useState(false);
  const [canRepeatInterrogate, setCanRepeatInterrogate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typedLength, setTypedLength] = useState(0);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const typewriterStarted = useRef(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Анімація друку резюме лише при першому заході на сторінку цього підозрюваного (за сесію)
  useEffect(() => {
    if (!suspect || loading) return;
    const key = RESUME_TYPED_KEY + suspectId;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(key) === "1") {
      setTypedLength(suspect.biography.length);
      setTypewriterDone(true);
      return;
    }
    if (typewriterStarted.current) return;
    typewriterStarted.current = true;
    const fullLen = suspect.biography.length;
    if (fullLen === 0) {
      setTypewriterDone(true);
      if (typeof window !== "undefined") window.sessionStorage.setItem(key, "1");
      return;
    }
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setTypedLength(n);
      if (n >= fullLen) {
        clearInterval(timer);
        setTypewriterDone(true);
        if (typeof window !== "undefined") window.sessionStorage.setItem(key, "1");
      }
    }, TYPEWRITER_MS_PER_CHAR);
    return () => clearInterval(timer);
  }, [suspect, suspectId, loading]);

  // Кнопка «Допити повторно» з’являється лише через 10 с після першого допиту
  useEffect(() => {
    if (!showTestimony || showSecondTestimony || caseDifficulty !== 6 || !testimony2) return;
    const t = setTimeout(() => setCanRepeatInterrogate(true), 10_000);
    return () => clearTimeout(t);
  }, [showTestimony, showSecondTestimony, caseDifficulty, testimony2]);

  // Таймер на сторінці резюме (той самий, що на сторінці гри)
  useEffect(() => {
    if (!caseId || caseDifficulty === null || typeof window === "undefined") return;
    const limit = getTimeLimitSeconds(caseDifficulty);
    const key = TIMER_STORAGE_PREFIX + caseId;
    let startedAt: number;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        startedAt = parseInt(stored, 10);
        if (Number.isNaN(startedAt)) startedAt = Date.now();
      } else {
        setTimeLeft(null);
        return;
      }
    } catch {
      setTimeLeft(null);
      return;
    }
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const remaining = Math.max(0, limit - elapsed);
    setTimeLeft(remaining);
    if (remaining <= 0) {
      router.replace(`/game?caseId=${caseId}`);
      return;
    }
    const tick = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(tick);
          router.replace(`/game?caseId=${caseId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [caseId, caseDifficulty, router]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: suspectData, error: suspectError } = await supabase
        .from("suspects")
        .select("*")
        .eq("id", suspectId)
        .single();
      if (suspectError || !suspectData) {
        setLoading(false);
        return;
      }
      setSuspect(suspectData as Suspect);

      if (caseId) {
        const { data: caseData } = (await supabase
          .from("cases")
          .select("difficulty")
          .eq("id", caseId)
          .single()) as { data: { difficulty: number } | null };
        if (caseData) setCaseDifficulty(caseData.difficulty);

        const { data: cs } = (await supabase
          .from("case_suspects")
          .select("testimony_text, testimony_text_2")
          .eq("case_id", caseId)
          .eq("suspect_id", suspectId)
          .single()) as { data: { testimony_text: string; testimony_text_2: string | null } | null };
        if (cs) {
          setTestimony(cs.testimony_text);
          if (cs.testimony_text_2) setTestimony2(cs.testimony_text_2);
        }
      }
      setLoading(false);
    })();
  }, [suspectId, caseId]);

  if (loading) {
    return (
      <div className="block-gif min-h-screen flex items-center justify-center">
        <p className="text-white">Завантаження...</p>
      </div>
    );
  }
  if (!suspect) {
    return (
      <div className="block-gif min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white">Підозрюваного не знайдено.</p>
        <Link href={caseId ? `/game?caseId=${caseId}` : "/"} className="text-yellow-400 hover:underline">
          Назад до справи
        </Link>
      </div>
    );
  }

  const backHref = caseId ? `/game?caseId=${caseId}` : "/game";
  const imgSrc = getPlaceholderImage(suspect);

  return (
    <div className="block-gif resume-page">
      {caseId && caseDifficulty !== null && timeLeft !== null && (
        <div className="resume-page__timer game-timer" aria-live="polite">
          Залишилось: {formatTime(timeLeft)}
        </div>
      )}
      <div className="resume-wrap">
        <Link href={backHref} className="link-back">
          ← До справи
        </Link>

        <div className="resume resume-paper">
          <header className="resume-top-line">
            <span className="resume-top-name">{suspect.name} {suspect.surname}</span>
            <span className="resume-top-title">{suspect.job}</span>
          </header>

          <div className="resume-grid">
            <aside className="resume-sidebar">
              <div className="resume-photo-wrap">
                <img src={imgSrc} alt="" className="resume-photo" width={200} height={260} />
              </div>
              <section className="resume-section">
                <h2 className="resume-section-title">Особисті дані</h2>
                <dl className="resume-dl">
                  <dt>Вік</dt>
                  <dd>{suspect.age}</dd>
                  <dt>Робота</dt>
                  <dd>{suspect.job}</dd>
                  <dt>Хобі</dt>
                  <dd>{suspect.hobby}</dd>
                  <dt>Погана звичка</dt>
                  <dd>{suspect.bad_habit}</dd>
                  <dt>Розмір взуття</dt>
                  <dd>{suspect.foot_size}</dd>
                  <dt>Колір волосся</dt>
                  <dd>{suspect.hair_color}</dd>
                </dl>
              </section>
            </aside>

            <main className="resume-main">
              <div className="resume-hero">
                <h1 className="resume-name">{suspect.name} {suspect.surname}</h1>
                <p className="resume-subtitle">{suspect.job}</p>
              </div>
              <section className="resume-section">
                <h2 className="resume-section-title">Резюме</h2>
                <p className="resume-bio">
                  {suspect.biography.slice(0, typedLength)}
                  {!typewriterDone && <span className="resume-typewriter-cursor" aria-hidden="true" />}
                </p>
              </section>
              <section className="resume-section">
                <h2 className="resume-section-title">Свідчення по справі</h2>
                {!showTestimony ? (
                  <button type="button" onClick={() => setShowTestimony(true)} className="btn-interrogate">
                    Допросити
                  </button>
                ) : (
                  <>
                    {testimony && (
                      <blockquote className="resume-testimony">&quot;{testimony}&quot;</blockquote>
                    )}
                    {caseDifficulty === 6 && testimony2 && !showSecondTestimony && (
                      canRepeatInterrogate ? (
                        <button
                          type="button"
                          onClick={() => setShowSecondTestimony(true)}
                          className="btn-interrogate btn-interrogate--second"
                        >
                          Допити повторно
                        </button>
                      ) : (
                        <p className="resume-testimony-wait" aria-live="polite">
                          Повторний допит можливий через 10 с.
                        </p>
                      )
                    )}
                    {showSecondTestimony && testimony2 && (
                      <>
                        <p className="resume-testimony-label">Повторний допит:</p>
                        <blockquote className="resume-testimony resume-testimony--second">
                          &quot;{testimony2}&quot;
                        </blockquote>
                      </>
                    )}
                    {!testimony && (
                      <p className="resume-testimony-empty">Свідчення відсутні для цієї справи.</p>
                    )}
                  </>
                )}
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
