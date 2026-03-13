import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import { buildCaseFromParts, selectSuspectsAndKiller } from "@/lib/caseGenerator";
import type { CasesInsert } from "@/types/database";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: "На сервері не задано NEXT_PUBLIC_SUPABASE_URL. Додай у .env.local." },
      { status: 503 }
    );
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "На сервері не задано SUPABASE_SERVICE_ROLE_KEY. Додай secret key у .env.local і перезапусти dev-сервер." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const difficulty = Math.min(5, Math.max(3, Number(body.difficulty) || 3));

    const supabase = createServerClient();

    const { data: suspects, error: suspectsError } = await supabase
      .from("suspects")
      .select("*");

    if (suspectsError || !suspects?.length) {
      return NextResponse.json(
        { error: "Не вдалося завантажити підозрюваних або пул порожній." },
        { status: 502 }
      );
    }

    const { suspects: selected, killerIndex } = selectSuspectsAndKiller(
      suspects,
      difficulty
    );

    const [
      { data: intros },
      { data: places },
      { data: weapons },
      { data: body_locations },
      { data: evidence },
    ] = await Promise.all([
      supabase.from("story_intros").select("id, text, setting"),
      supabase.from("story_places").select("id, text, link_job, setting"),
      supabase.from("story_weapons").select("id, text, link_job, setting"),
      supabase.from("story_body_locations").select("id, text, link_job, setting"),
      supabase.from("story_evidence").select("id, text, hint_type, hint_value"),
    ]);

    const parts = {
      intros: intros ?? [],
      places: places ?? [],
      weapons: weapons ?? [],
      body_locations: body_locations ?? [],
      evidence: evidence ?? [],
    };
    if (
      !parts.intros.length ||
      !parts.places.length ||
      !parts.weapons.length ||
      !parts.body_locations.length ||
      !parts.evidence.length
    ) {
      return NextResponse.json(
        {
          error:
            "У базі немає частинок історії. Виконай міграцію 002_story_parts та seed_story_parts.sql.",
        },
        { status: 502 }
      );
    }

    const { case: caseData, caseSuspects } = buildCaseFromParts(
      parts,
      selected,
      killerIndex,
      difficulty
    );

    const casePayload: CasesInsert = {
      intro_text: caseData.intro_text,
      body_location: caseData.body_location,
      tool_description: caseData.tool_description,
      evidence_description: caseData.evidence_description,
      difficulty: caseData.difficulty,
      killer_id: caseData.killer_id,
      motive: caseData.motive,
      confession_text: caseData.confession_text,
    };
    const { data: insertedCase, error: caseError } = (await supabase
      .from("cases")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client infers insert as never with manual Database types
      .insert(casePayload as any)
      .select("id")
      .single()) as { data: { id: string } | null; error: Error | null };

    if (caseError || !insertedCase?.id) {
      console.error("Case insert error:", caseError);
      return NextResponse.json(
        { error: "Не вдалося створити справу." },
        { status: 500 }
      );
    }

    const caseId = insertedCase.id;
    const rows = caseSuspects.map((cs) => ({
      case_id: caseId,
      suspect_id: cs.suspect_id,
      is_killer: cs.is_killer,
      testimony_text: cs.testimony_text,
    }));

    const { error: csError } = await supabase
      .from("case_suspects")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client infers insert as never with manual Database types
      .insert(rows as any);

    if (csError) {
      console.error("Case suspects insert error:", csError);
      await (supabase.from("cases") as any).delete().eq("id", caseId);
      return NextResponse.json(
        { error: "Не вдалося прив'язати підозрюваних до справи." },
        { status: 500 }
      );
    }

    return NextResponse.json({ caseId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "Сервер не налаштований для генерації справ (відсутній service role key)." },
        { status: 503 }
      );
    }
    console.error("Generate case error:", err);
    return NextResponse.json(
      { error: "Помилка генерації справи." },
      { status: 500 }
    );
  }
}
