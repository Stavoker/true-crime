/**
 * Procedural case generator: builds a murder case from story parts (DB) and suspects.
 * Evidence at crime scene always helps (matches killer); place/weapon/body can hint (link_job) or be "water".
 */

import type { Suspect } from "@/types/database";

export interface StoryParts {
  intros: { id: string; text: string; setting: string | null }[];
  places: { id: string; text: string; link_job: string | null; setting: string | null }[];
  weapons: { id: string; text: string; link_job: string | null; setting: string | null }[];
  body_locations: { id: string; text: string; link_job: string | null; setting: string | null }[];
  evidence: { id: string; text: string; hint_type: string; hint_value: string }[];
}

export interface GeneratedCase {
  intro_text: string;
  body_location: string;
  tool_description: string;
  evidence_description: string;
  difficulty: number;
  killer_id: string;
  motive: string;
  confession_text: string;
}

export interface GeneratedCaseSuspect {
  suspect_id: string;
  is_killer: boolean;
  testimony_text: string;
}

const MOTIVES_MALE = [
  "Він не повернув мені гроші. Я позичив йому велику суму, а він сміявся мені в обличчя. Тієї ночі я втратив контроль.",
  "Він зруйнував мою репутацію і сім'ю. Я більше не міг це виносити.",
  "Він прийшов вимагати гроші назад і називав мене шахраєм. Робота була зроблена — він просто передумав. Я втратив терпіння.",
  "Він був моїм командиром. Через нього загинули мої хлопці. Я двадцять років носив це в собі.",
  "Він знищив кар'єру мого брата. Мій брат помер через його доноси. Я вирішив, що він відплатить.",
  "Він здав мене під час внутрішнього розслідування. Я втратив усе. Той вечір він знову сміявся мені в обличчя.",
  "Він займав моє місце і хвалився цим. Я не витримав.",
  "Він хотів знести те, що я будував роками. Я не дозволив би йому це знищити.",
];

const MOTIVES_FEMALE = [
  "Він знищив кар'єру мого брата. Мій брат помер через його доноси. Я вирішила, що він відплатить тим самим.",
  "Він зруйнував мою репутацію. Через його донос я ледь не пішла у в'язницю. Він прийшов вимагати «мовчати назавжди».",
  "Він відмовив мені у виставці і знищив мої роботи публічно. Я втратила все. Він заслуговував на це.",
  "Він вклав гроші, потім вимагав повернення з відсотками і погрожував знищити клініку. Я не могла цього допустити.",
  "Він публічно звинувачував мене в плагіаті. Справа не дійшла до суду, але я обіцяла відповісти по-своєму.",
  "Він звинуватив мене в помилці і підробив документи. Я ледь не втратила ліцензію.",
  "Він зруйнував наші стосунки і залишив мене з боргами. Я не могла більше це виносити.",
  "Він погрожував рознести репутацію мого місця роботи. Той вечір він переступив межу.",
];

const CONFESSIONS_MALE = [
  "Так, це був я. Я не планую нічого заперечувати. Він зруйнував мою репутацію і сім'ю. Я більше не міг це виносити.",
  "Так, я це зробив. Він прийшов і знову почав погрожувати. Я втратив себе. Не думав — просто вдарив.",
  "Так. Він прийшов, почав кричати. Все сталося за хвилину. Я не планував.",
  "Я додав отруту. Я знав дозу. Він не страждав довго. Я не шкодую.",
  "Так, це я. Я випив, побачив його — і все попливло. Я не шкодую. Він заслужив.",
  "Так. Він зайшов — я сказав, що треба поговорити. Він нічого не підозрював.",
  "Я був там. Ми сварились. Я втратив контроль. Не пам'ятаю деталей.",
];

const CONFESSIONS_FEMALE = [
  "Я додала отруту в його напій. Я знала дозу. Він не страждав довго. Я не шкодую.",
  "Так, це я. Він сміявся над моїми роботами. Я не планувала — все сталося там. Ніготь зламала під час боротьби.",
  "Так. Він прийшов «обговорити умови». Я запропонувала йому чай. Він не підозрював, що я знаю дози краще за когось.",
  "Так, це я. Він зайшов до складу — я сказала, що треба підписати документи. Він нічого не підозрював.",
  "Я була поруч. Ми сварились. Я не хочу більше нічого говорити.",
  "Так. Я зробила так, щоб він мовчав. Він сам прийшов вимагати.",
  "Я втратила себе того вечора. Він заслуговував. Я не шкодую.",
];

// Свідчення вбивці (підказки) — окремо для чоловіків і жінок, щоб не перемішувати
const TESTIMONY_HINTS_MALE = [
  "Я заходив туди того вечора — він кликав мене поговорити. Ми сперечались. Пішов у лють, деталей уже не пам'ятаю.",
  "Я був там. Ми сварились. Що до мотиву — перевірте мою біографію. Більше нічого не скажу.",
  "Він прийшов того вечора. Ми розмовляли, потім посварились. Я не планував того, що сталося. Все відбулось швидко.",
  "Я був у кімнаті. Він вимагав від мене грошей або ще чогось. Я втратив контроль. Не виправдовуюсь.",
  "Того вечора я там був. Сліди можуть бути моїми — я там часто. Про мотив уже казав: дивіться в справу.",
  "Ми мали конфлікт. Він прийшов сам. Я не хочу деталізувати — перевірте документи.",
  "Так, я там був і з ним говорив. Розмова перейшла в сварку. Решту не коментую.",
  "Я палю — тож сліди тютюну можуть бути моїми. Ми сперечались про гроші. Далі не пам'ятаю.",
];

const TESTIMONY_HINTS_FEMALE = [
  "Я була поруч того вечора. Він підійшов до мене, ми розмовляли. Потім посварились. Деталі опускаю.",
  "Я була там одна. Він прийшов без запису, сказав, що треба поговорити. Далі не хочу говорити.",
  "Так, я там була. Ми сварились. Мотив — у моїй біографії, перевірте. Більше нічого не додам.",
  "Він прийшов того дня. Я приймала його у себе — у процедурній, у залі, не важливо. Ми мали непорозуміння.",
  "Я залишалась після закриття. Він з'явився несподівано. Що між нами було — у справі. Не буду повторювати.",
  "Я була поруч із його столиком. Могла торкнутися келиха, речей. Особистого мотиву не заперечую. Деталі — у біографії.",
  "Того вечора я була там. Ми розмовляли, потім посварились. Що сталося далі — не коментую.",
  "Він вимагав від мене щось, що я не могла дати. Я була там. Решту не хочу обговорювати.",
];

// Свідчення невинних (відволікаючі) — окремо за статтю, без прив'язки до професії
const TESTIMONY_RED_HERRING_MALE = [
  "Того вечора я там не був. Маю алібі — був вдома, можу підтвердити. З жертвою не спілкувався.",
  "Я того дня не був у тому місці. Сидів у кімнаті, працював або читав. З ним не сварився.",
  "Не знаю нічого про ту сварку. Я був у іншому кутку закладу, з жертвою не розмовляв.",
  "Я пив у іншому залі. Бачив, що хтось підходив до нього — хто саме, не знаю. Сам не підходив.",
  "Того вечора я був на роботі в іншому місці. Запис у журналі є. З цим чоловіком не знайомий.",
  "Я того дня не виходив з дому. Працював віддалено. До місця події не маю жодного стосунку.",
  "Був там як відвідувач. Бачив двох у сварці, не втручався. Пішов до півночі. Хто що зробив — не знаю.",
  "Я був з колегами. Виходив тільки на перекур. У ту алею чи ту кімнату не заходив. З жертвою не знайомий.",
  "У мене інший розмір взуття — можете перевірити. Того вечора там не був. З ним конфлікту не мав.",
  "Я не маю до цього стосунку. Того дня був у зовсім іншому місці. Алібі можу надати.",
  "З жертвою був знайомий поверхнево. Того вечора його не бачив і до нього не підходив.",
  "Не знаю, хто міг це зробити. Я там не був або був дуже мало. Нічого підозрілого не бачив.",
];

const TESTIMONY_RED_HERRING_FEMALE = [
  "Того вечора я там не була. Маю алібі — була вдома або на виклику. З жертвою не спілкувалась.",
  "Я того дня не була в тому місці. Була з клієнтом в іншій кімнаті. До його столика не підходила.",
  "Не знаю, хто мав доступ до нього. Я була в іншому залі. З ним не розмовляла.",
  "Я була там того дня, але ні до чого не причетна. З жертвою не сварилась і до його речей не торкалась.",
  "Того вечора я була на роботі в іншому закладі. Можу підтвердити. З цим чоловіком не знайома.",
  "Я того дня не виходила з дому — працювала віддалено. До місця події не маю стосунку.",
  "Була там як відвідувачка. Бачила сварку збоку, не підходила. Особистого мотиву не маю.",
  "У мене інший розмір взуття — можете перевірити. Того вечора там не була. З ним не конфліктувала.",
  "Я не маю до цього стосунку. Того дня була в редакції, на зустрічі — можу надати алібі.",
  "З жертвою була знайома лише візуально. Того вечора до нього не підходила і нічого не бачила.",
  "Не знаю, хто міг це зробити. Я там не була або пройшла повз. Нічого підозрілого не помітила.",
  "Я там працюю, але того вечора була за стійкою. Бачила, як вони вийшли разом. Хто що зробив — не бачила.",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Обирає свідчення за статтю персонажа, щоб не перемішувати (чоловік не каже «я була»). */
function pickTestimony(suspect: Suspect, isKiller: boolean): string {
  const isMale = suspect.gender === "male";
  if (isKiller) {
    return pick(isMale ? TESTIMONY_HINTS_MALE : TESTIMONY_HINTS_FEMALE);
  }
  return pick(isMale ? TESTIMONY_RED_HERRING_MALE : TESTIMONY_RED_HERRING_FEMALE);
}

function shuffle<T>(array: T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick one from list; if useHint and list has item with link_job === killerJob, 50% pick that. */
function pickPlaceOrWeaponOrBody<T extends { link_job: string | null }>(
  list: T[],
  killerJob: string,
  useHint: boolean
): T {
  if (list.length === 0) throw new Error("Empty story part list");
  const withHint = list.filter((x) => x.link_job === killerJob);
  const pool =
    useHint && withHint.length > 0 && Math.random() < 0.5 ? withHint : list;
  return pick(pool);
}

/** Evidence must always help: only rows that match the killer. Тип доказу випадковий (не завжди взуття). */
function pickEvidenceForKiller(
  evidenceList: { text: string; hint_type: string; hint_value: string }[],
  killer: Suspect
): string {
  const matches = evidenceList.filter((e) => {
    if (e.hint_type === "foot_size") return e.hint_value === String(killer.foot_size);
    if (e.hint_type === "gender") return e.hint_value === killer.gender;
    if (e.hint_type === "job") return e.hint_value === killer.job;
    if (e.hint_type === "bad_habit") return e.hint_value === killer.bad_habit;
    if (e.hint_type === "hair_color") return e.hint_value === killer.hair_color;
    return false;
  });
  if (matches.length === 0) {
    return evidenceList[0]?.text ?? "На місці знайдено сліди; слідство перевіряє алібі.";
  }
  // Один випадковий тип доказу (іноді взуття, іноді стать, звичка, професія тощо)
  const chosen = [pick(matches)];
  if (matches.length > 1 && Math.random() < 0.4) {
    const other = pick(matches.filter((m) => m !== chosen[0]));
    chosen.push(other);
  }
  return chosen.map((c) => c.text).join(" ");
}

export function buildCaseFromParts(
  parts: StoryParts,
  suspects: Suspect[],
  killerIndex: number,
  difficulty: number
): { case: GeneratedCase; caseSuspects: GeneratedCaseSuspect[] } {
  const killer = suspects[killerIndex];
  const isMale = killer.gender === "male";

  if (
    parts.intros.length === 0 ||
    parts.places.length === 0 ||
    parts.weapons.length === 0 ||
    parts.body_locations.length === 0 ||
    parts.evidence.length === 0
  ) {
    throw new Error("Missing story parts in DB; run seed_story_parts.sql");
  }

  // Одна тема справи: інтро, місце, знаряддя й де знайшли тіло — з одного setting
  const settings = [...new Set(parts.intros.map((i) => i.setting).filter(Boolean))] as string[];
  const chosenSetting = settings.length > 0 ? pick(settings) : null;
  const bySetting = <T extends { setting: string | null }>(list: T[]) =>
    chosenSetting ? list.filter((x) => x.setting === chosenSetting) : list;
  const introsForCase = chosenSetting ? parts.intros.filter((i) => i.setting === chosenSetting) : parts.intros;
  const placesForCase = bySetting(parts.places).length > 0 ? bySetting(parts.places) : parts.places;
  const weaponsForCase = bySetting(parts.weapons).length > 0 ? bySetting(parts.weapons) : parts.weapons;
  const bodyForCase =
    bySetting(parts.body_locations).length > 0 ? bySetting(parts.body_locations) : parts.body_locations;

  const intro = pick(introsForCase);
  const place = pickPlaceOrWeaponOrBody(placesForCase, killer.job, true);
  const weapon = pickPlaceOrWeaponOrBody(weaponsForCase, killer.job, true);
  const bodyLocation = pickPlaceOrWeaponOrBody(bodyForCase, killer.job, true);
  const evidenceDescription = pickEvidenceForKiller(parts.evidence, killer);

  const motive = pick(isMale ? MOTIVES_MALE : MOTIVES_FEMALE);
  const confession = pick(isMale ? CONFESSIONS_MALE : CONFESSIONS_FEMALE);

  const caseData: GeneratedCase = {
    intro_text: intro.text,
    body_location: bodyLocation.text,
    tool_description: weapon.text,
    evidence_description: evidenceDescription,
    difficulty,
    killer_id: killer.id,
    motive,
    confession_text: confession,
  };

  const caseSuspects: GeneratedCaseSuspect[] = suspects.map((s, i) => ({
    suspect_id: s.id,
    is_killer: i === killerIndex,
    testimony_text: pickTestimony(s, i === killerIndex),
  }));

  return { case: caseData, caseSuspects };
}

/**
 * From a pool of suspects, pick `count` at random and choose one as killer.
 */
export function selectSuspectsAndKiller(
  pool: Suspect[],
  count: number
): { suspects: Suspect[]; killerIndex: number } {
  if (pool.length < count) {
    throw new Error(`Not enough suspects: need ${count}, have ${pool.length}`);
  }
  const shuffled = shuffle(pool);
  const suspects = shuffled.slice(0, count);
  const killerIndex = Math.floor(Math.random() * suspects.length);
  return { suspects, killerIndex };
}
