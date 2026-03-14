export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Empty relationships array required by Supabase client GenericTable. */
const RELATIONSHIPS = [] as const;

export interface Database {
  public: {
    Tables: {
      suspects: {
        Row: {
          id: string;
          name: string;
          surname: string;
          gender: "male" | "female";
          age: number;
          job: string;
          hobby: string;
          bad_habit: string;
          foot_size: number;
          hair_color: string;
          biography: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["suspects"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suspects"]["Insert"]>;
        Relationships: typeof RELATIONSHIPS;
      };
      cases: {
        Row: {
          id: string;
          intro_text: string;
          body_location: string;
          tool_description: string;
          evidence_description: string;
          difficulty: number; // 3, 5, or 6 (easy / medium / hard)
          killer_id: string;
          motive: string;
          confession_text: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cases"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cases"]["Insert"]>;
        Relationships: typeof RELATIONSHIPS;
      };
      case_suspects: {
        Row: {
          id: string;
          case_id: string;
          suspect_id: string;
          is_killer: boolean;
          testimony_text: string;
          testimony_text_2: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["case_suspects"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["case_suspects"]["Insert"]>;
        Relationships: typeof RELATIONSHIPS;
      };
      story_intros: {
        Row: { id: string; text: string; setting: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["story_intros"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["story_intros"]["Insert"]>;
        Relationships: typeof RELATIONSHIPS;
      };
      story_places: {
        Row: { id: string; text: string; link_job: string | null; setting: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["story_places"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["story_places"]["Insert"]>;
        Relationships: typeof RELATIONSHIPS;
      };
      story_weapons: {
        Row: { id: string; text: string; link_job: string | null; setting: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["story_weapons"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["story_weapons"]["Insert"]>;
        Relationships: typeof RELATIONSHIPS;
      };
      story_body_locations: {
        Row: { id: string; text: string; link_job: string | null; setting: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["story_body_locations"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["story_body_locations"]["Insert"]>;
        Relationships: typeof RELATIONSHIPS;
      };
      story_evidence: {
        Row: { id: string; text: string; hint_type: string; hint_value: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["story_evidence"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["story_evidence"]["Insert"]>;
        Relationships: typeof RELATIONSHIPS;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Suspect = Database["public"]["Tables"]["suspects"]["Row"];
export type Case = Database["public"]["Tables"]["cases"]["Row"];
export type CaseSuspect = Database["public"]["Tables"]["case_suspects"]["Row"];

/** Explicit insert payload for `cases` — use for .insert() to satisfy Supabase client generics. */
export type CasesInsert = {
  intro_text: string;
  body_location: string;
  tool_description: string;
  evidence_description: string;
  difficulty: number;
  killer_id: string;
  motive: string;
  confession_text: string;
};
