"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Suspect } from "@/types/database";

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
  const suspectId = params.id as string;
  const caseId = searchParams.get("caseId");

  const [suspect, setSuspect] = useState<Suspect | null>(null);
  const [testimony, setTestimony] = useState<string | null>(null);
  const [showTestimony, setShowTestimony] = useState(false);
  const [loading, setLoading] = useState(true);

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
        const { data: cs } = await supabase
          .from("case_suspects")
          .select("testimony_text")
          .eq("case_id", caseId)
          .eq("suspect_id", suspectId)
          .single();
        if (cs) setTestimony(cs.testimony_text);
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
                <p className="resume-bio">{suspect.biography}</p>
              </section>
              <section className="resume-section">
                <h2 className="resume-section-title">Свідчення по справі</h2>
                {!showTestimony ? (
                  <button type="button" onClick={() => setShowTestimony(true)} className="btn-interrogate">
                    Допросити
                  </button>
                ) : testimony ? (
                  <blockquote className="resume-testimony">&quot;{testimony}&quot;</blockquote>
                ) : (
                  <p className="resume-testimony-empty">Свідчення відсутні для цієї справи.</p>
                )}
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
