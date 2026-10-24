import { SEED_FAMILY } from "./seed";
import type { FamilyState } from "./types";

/**
 * Fictional demo scenarios. Each one is a complete example family state plus the copy the UI needs.
 * Everything here is invented for demonstration; none of it describes real people.
 */
export type ScenarioId = "career" | "party-night";

export interface Starter {
  tag: string;
  question: string;
}

export interface PlanSide {
  /** Possible interpretations, written as possibilities. Not derived from anyone's private notes. */
  mightWant: string[];
  opener: string;
}

export interface ConversationPlan {
  title: string;
  intro: string;
  parent: PlanSide;
  teen: PlanSide;
  questions: string[];
  agreement: { label: string; prompt: string }[];
  pauseReminder: string;
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  parentName: string;
  teenName: string;
  /** "daughter", "son", "teen"... used only in copy. */
  childNoun: string;
  /** Short description shown in the scenario picker. */
  blurb: string;
  /** Label of the "help me prepare" button on the parent's context page. */
  prepareLabel: string;
  /**
   * Optional example text for the Plan page's share box, per audience. It only fills the DRAFT: the person still
   * has to review it and press Share. Fictional demo text.
   */
  shareExample?: Partial<Record<"parent" | "teen", string>>;
  seed: FamilyState;
  parentStarters: Starter[];
  teenStarters: Starter[];
  /** The scenario's main prompt for each audience (the "guided demo" button). */
  parentDemoPrompt: string;
  teenDemoPrompt: string;
  plan: ConversationPlan;
}

// ----- shared, general plan pieces ------------------------------------------------------------

const PAUSE = "Either of you can say \u201cCan we pause and come back to this?\u201d at any time. Stopping is not losing.";

// ----- Career (the original demo) -----------------------------------------------------------------

const CAREER_PARENT_PROMPT =
  "How can I talk with my teen about a career choice when my hopes differ from their preference?";
const CAREER_TEEN_PROMPT = "How do I talk to my parent about my future plans without it turning into an argument?";

const career: Scenario = {
  id: "career",
  label: "Career conversation",
  parentName: "Alex",
  teenName: "Sam",
  childNoun: "teen",
  blurb: "A parent hopes for a stable career; the teen is drawn to game design.",
  prepareLabel: "Help me prepare: a career conversation",
  seed: SEED_FAMILY,
  parentDemoPrompt: CAREER_PARENT_PROMPT,
  teenDemoPrompt: CAREER_TEEN_PROMPT,
  parentStarters: [
    {
      tag: "Understand a perspective",
      question: "My teen has become withdrawn lately. What might be going on, and how can I check in gently?",
    },
    { tag: "Prepare a conversation", question: CAREER_PARENT_PROMPT },
    {
      tag: "How might this land?",
      question: "How might my teen hear this: \u201cWe need to talk about your grades tonight\u201d?",
    },
    {
      tag: "Clarify my intentions",
      question: "I want to protect my teen without controlling them. How can I tell the difference?",
    },
  ],
  teenStarters: [
    { tag: "Put it into words", question: "I feel annoyed and I'm not sure why. Can you help me figure out what I'm feeling?" },
    { tag: "Prepare for a hard talk", question: CAREER_TEEN_PROMPT },
    { tag: "Explore what I'm into", question: "How can I explain to my family why I'm excited about game design?" },
    { tag: "Decide what to share", question: "How do I decide what to tell my parents and what to keep to myself?" },
    { tag: "Just need support", question: "Today was rough and I don't want advice yet. Can we just talk?" },
  ],
  plan: {
    title: "Talking about future plans",
    intro: "A general outline for a calm conversation about the future when hopes differ.",
    parent: {
      mightWant: [
        "One possibility: the worry is about security, not about doubting their abilities.",
        "Another possibility: the hopes are meant as care, not as a decision already made.",
      ],
      opener: "\u201cI'd like to understand what excites you about this. I'll listen first, then share what's on my mind.\u201d",
    },
    teen: {
      mightWant: [
        "One possibility: this interest is real and has been thought through.",
        "Another possibility: they want to be part of the decision, not handed one.",
      ],
      opener: "\u201cCan I show you what I've been working on and why it matters to me?\u201d",
    },
    questions: [
      "What would a good outcome look like for each of us?",
      "What worries you most, and what would help with that worry?",
      "What could we try or find out together before deciding anything?",
    ],
    agreement: [
      { label: "Next step", prompt: "One thing we will try or look into together:" },
      { label: "Check-in", prompt: "When we will talk about it again:" },
      { label: "If it gets tense", prompt: "What either of us can say to pause:" },
    ],
    pauseReminder: PAUSE,
  },
};

// ----- Party Night ------------------------------------------------------------------------------

export const PARTY_PARENT_PROMPT =
  "I argued with my daughter about what she was wearing to a party. I was worried about how some people might treat her, but I came across as controlling. Now she's left upset. How can I repair this?";
export const PARTY_TEEN_PROMPT =
  "My dad got upset about my party outfit, and it felt like he didn't trust me. I left angry. How can I explain my side without starting another argument?";

const PARTY_SEED: FamilyState = {
  parent: {
    stage: "adolescence",
    intentions: "I want Maya to be independent and to feel that I trust her.",
    values: "Respect, honesty, and looking out for each other.",
    hopes: "That Maya enjoys the party, gets home safely, and still wants to talk to me afterwards.",
    concerns:
      "I worry about unwanted attention and some people at the party behaving disrespectfully. I find it hard to say that without sounding judgmental or controlling.",
    worldview: "",
    nurturingGoals: ["independence", "emotional_skills"],
    situation:
      "We argued about her outfit for tonight's party. I raised my voice, it escalated, and she left upset. I regret how it went and want to repair things.",
  },
  teen: {
    interests: "Fashion and putting outfits together, music, hanging out with my friends.",
    strengths: "I know what I like, and I'm loyal to my friends.",
    careerIdeas: "",
    aspirations: "To be trusted to make my own age-appropriate choices.",
    situation:
      "All my friends are wearing short dresses to the party, and it honestly felt like I had to wear one too or I'd be the odd one out. I also like this dress and feel good in it. When Dad objected I felt judged and misunderstood, so I left.",
    goals: [
      { id: "pt1", text: "Have a fun, safe night with my friends", status: "doing", shared: true },
      { id: "pt2", text: "Talk to Dad when I've calmed down", status: "todo", shared: false },
    ],
    reflections: [
      {
        id: "pr1",
        text: "I picked this outfit because I love it. It's not just because of my friends.",
      },
      { id: "pr2", text: "I wish he'd asked what I thought instead of telling me." },
    ],
  },
  shared: {
    goals: [
      { id: "ps1", text: "Make future disagreements feel less hurtful", status: "doing", shared: true },
      { id: "ps2", text: "Be able to talk about safety and independence respectfully", status: "todo", shared: true },
    ],
    routines: "",
    commitments: "We both care about our relationship. We agree to take a break if an argument starts to escalate.",
    messages: [],
  },
};

const partyNight: Scenario = {
  id: "party-night",
  label: "Party Night",
  parentName: "David",
  teenName: "Maya",
  childNoun: "daughter",
  blurb: "An argument about a party outfit escalates. Both want to repair it.",
  prepareLabel: "Help me prepare: repairing after Party Night",
  shareExample: {
    teen:
      "Dad, all my friends are wearing short dresses tonight and it felt like I had to wear one too, or I'd be left out. I do like the dress as well. I'm sorry I walked out. I'd be okay agreeing on a check-in plan for tonight.",
  },
  seed: PARTY_SEED,
  parentDemoPrompt: PARTY_PARENT_PROMPT,
  teenDemoPrompt: PARTY_TEEN_PROMPT,
  parentStarters: [
    { tag: "Repair after an argument", question: PARTY_PARENT_PROMPT },
    {
      tag: "How might this land?",
      question: "How might my daughter hear it if I say: \u201cI'm not comfortable with you wearing that\u201d?",
    },
    {
      tag: "Safety without control",
      question: "How can I talk about staying safe at a party without making it about her clothes?",
    },
    { tag: "Clarify my intentions", question: "How do I apologise for how I said something while still being honest that I worry?" },
  ],
  teenStarters: [
    { tag: "Explain my side", question: PARTY_TEEN_PROMPT },
    { tag: "Put it into words", question: "I'm still angry about tonight. Can you help me work out what I'm actually feeling?" },
    { tag: "Ask what he meant", question: "How can I ask my dad what he was really worried about without it sounding like a fight?" },
    { tag: "Safety on my terms", question: "What's a simple safety plan for a party that my parent and I could both be okay with?" },
    { tag: "Decide what to share", question: "Do I have to tell my dad everything I feel, or can I keep some of it to myself?" },
  ],
  plan: {
    title: "After Party Night: a conversation plan",
    intro:
      "Built only from general guidance and what you have both agreed to share. It does not use either person's private notes or chats.",
    parent: {
      mightWant: [
        "One possibility: the worry was about how other people might behave, not about her judgment or her clothes.",
        "Another possibility: he would like to be able to raise a worry without it sounding like he doesn't trust her.",
      ],
      opener:
        "\u201cI'm sorry for how I reacted. I was worried, and I said it in a way that felt controlling. I'd like to hear how it felt for you.\u201d",
    },
    teen: {
      mightWant: [
        "One possibility: the outfit is something she chose for herself and likes.",
        "Another possibility: being questioned about it may have sounded like not being trusted.",
      ],
      opener:
        "\u201cI felt judged when you objected. Can I explain why the outfit matters to me, and can you tell me what you were worried about?\u201d",
    },
    questions: [
      "What were you most worried about, and what would help with that worry?",
      "What would help you feel trusted the next time something like this comes up?",
      "What would make it easier for both of us to raise a concern without it turning into an argument?",
    ],
    agreement: [
      { label: "Getting there and home", prompt: "How you'll travel there and back, and who is driving:" },
      { label: "Check-ins", prompt: "When and how you'll check in (keep it light, e.g. one text on arrival):" },
      {
        label: "If someone feels unsafe",
        prompt: "A code word or message that means \u201cpick me up, no questions tonight\u201d, and who else to call:",
      },
      { label: "Talking later", prompt: "When you'll talk about how the night went:" },
    ],
    pauseReminder: PAUSE,
  },
};

export const SCENARIOS: Record<ScenarioId, Scenario> = { career, "party-night": partyNight };
export const SCENARIO_ORDER: ScenarioId[] = ["party-night", "career"];
export const DEFAULT_SCENARIO: ScenarioId = "career";

export function isScenarioId(v: unknown): v is ScenarioId {
  return v === "career" || v === "party-night";
}
