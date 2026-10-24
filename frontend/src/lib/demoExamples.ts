import { PARTY_PARENT_PROMPT, PARTY_TEEN_PROMPT } from "./family/scenarios";

/**
 * Pre-written example answers for the public demo (live AI off). Written by the team in advance, NOT generated.
 * The UI labels every one as "Pre-written example". They follow the same rules as the live assistant: possibilities
 * rather than facts about the other person, no use of the other person's private notes, no citations.
 */
const CAREER_PARENT =
  "How can I talk with my teen about a career choice when my hopes differ from their preference?";
const CAREER_TEEN = "How do I talk to my parent about my future plans without it turning into an argument?";

const EXAMPLES: Record<string, string> = {
  [PARTY_PARENT_PROMPT]: `It says a lot that you want to repair this. Wanting to keep her safe and wanting her to feel trusted can both be true.

**Start with the repair, not the concern.** A short apology for how it came out can open the door: "I'm sorry I raised my voice. That's not how I want to talk to you." Apologising for *how* you said it doesn't mean dropping the worry.

**Separate intention from impact.** You meant to protect her. One possibility is that she heard it as not being trusted, or as judgement about her choice. Only she can tell you how it felt, so ask.

**Aim the worry at other people's behaviour, not her clothes.** What someone wears never causes or excuses disrespectful behaviour; that responsibility sits with the people who behave that way.

**Plan for safety together, as support.** How she gets there and home, a quick check-in text, and a no-questions-asked pickup if she ever wants to leave.

A gentle opener: "Can we start over? I'd really like to hear how that felt for you."`,

  [PARTY_TEEN_PROMPT]: `Feeling judged by someone you care about really stings, and it makes sense that you left upset.

**Lead with how you felt.** "When you objected to my outfit, I felt judged, like you didn't trust me to make my own choice." Starting with "I" is harder to argue with than "you always…".

**Say why it matters to you.** Maybe you like it, feel good in it, or want to feel like part of the group. You get to decide how much of that you share.

**Ask what he was worried about.** "What were you actually worried about?" You can't know what's behind his reaction until you ask, and it might be about other people, not you.

**Offer a plan on your terms.** A text when you arrive, how you're getting home, a code word for a pickup. That isn't giving in; it shows you've got it handled.

If it starts heating up, it's okay to say: "Can we take a break and come back to this?"`,

  [CAREER_PARENT]: `It's natural to have hopes for your teen's future, and it's also natural for them to have their own.

**Listen first.** Ask what draws them to their idea and what a good day doing it would look like, before sharing your view.

**Name your hope as yours.** "Part of me hopes for something that feels secure to me, and I want to be upfront about that. But this is your life to build."

**Get specific about the worry.** Often it's about income or a back-up plan. Those are fair questions to explore together, not a verdict on their choice.

**Keep it a conversation, not a decision.** You don't have to agree today. A next step you both try, like talking to someone in that field, can help more than a debate.`,

  [CAREER_TEEN]: `Wanting your parent to take your plans seriously is completely fair.

**Pick a calm moment,** not right after a disagreement.

**Say what you want understood:** "I've thought about this, and it matters to me. Can I tell you why?"

**Ask about their side:** "What worries you about it?" One possibility is that the worry is about security, not about doubting you.

**Suggest a next step together,** like a course, a project, or talking to someone who works in the field.

And if it gets tense, it's okay to pause and come back to it later.`,
};

export function demoExampleFor(question: string): string | null {
  return EXAMPLES[question.trim()] ?? null;
}

export function hasDemoExample(question: string): boolean {
  return question.trim() in EXAMPLES;
}
