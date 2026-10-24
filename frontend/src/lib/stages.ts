import type { ParentingStage } from "./types";

export interface StageOption {
  id: ParentingStage;
  label: string;
  suggestions: string[];
}

// Single source of truth for stage labels and suggested questions.
// Suggestions are neutral conversation starters, not claims about evidence.
export const STAGES: StageOption[] = [
  {
    id: "preparing",
    label: "Preparing for parenthood",
    suggestions: [
      "How can my partner and I get ready for becoming parents?",
      "What worries are normal before a first baby arrives?",
      "How do we talk about parenting styles before the baby comes?",
    ],
  },
  {
    id: "pregnancy_infancy",
    label: "Pregnancy and infancy",
    suggestions: [
      "How can I cope with sleep deprivation with a newborn?",
      "What are gentle ways to build a routine with a baby?",
      "How do I take care of myself while caring for an infant?",
    ],
  },
  {
    id: "early_childhood",
    label: "Early childhood",
    suggestions: [
      "How can I stay calm during toddler tantrums?",
      "How do I set limits without constant battles?",
      "What can help with a bedtime routine for a preschooler?",
    ],
  },
  {
    id: "school_age",
    label: "School-age children",
    suggestions: [
      "How can I help my child with homework stress?",
      "My child is struggling with friendships. How can I support them?",
      "How do we handle screen time without daily arguments?",
    ],
  },
  {
    id: "adolescence",
    label: "Adolescence",
    suggestions: [
      "How can I keep communication open with my teenager?",
      "My teen shuts down when I ask questions. What can I try?",
      "How do I set boundaries while respecting their independence?",
    ],
  },
  {
    id: "adult_relationships",
    label: "Adult family relationships",
    suggestions: [
      "How can I set healthy boundaries with my adult child?",
      "How do I have a hard conversation with my parents?",
      "How can we rebuild closeness after a family disagreement?",
    ],
  },
];

export const GENERAL_SUGGESTIONS = [
  "How can I stay calm when my child is melting down?",
  "How do I talk with my child about a hard topic?",
  "I feel overwhelmed as a parent. Where do I start?",
];

export function suggestionsFor(stage: ParentingStage | null): string[] {
  return STAGES.find((s) => s.id === stage)?.suggestions ?? GENERAL_SUGGESTIONS;
}
