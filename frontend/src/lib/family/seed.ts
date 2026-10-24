import type { FamilyState } from "./types";

// ALL FICTIONAL. "Alex" (parent) and "Sam" (teen) are example profiles for the demo.
export const PARENT_NAME = "Alex";
export const TEEN_NAME = "Sam";

export const SEED_FAMILY: FamilyState = {
  parent: {
    stage: "adolescence",
    intentions: "Help Sam think for themselves while we stay close as a family.",
    values: "Honesty, curiosity, kindness, and respect for our family traditions.",
    hopes: "I hope Sam chooses a stable career path, such as medicine or engineering.",
    concerns: "I worry a creative tech career won't be secure. I don't want my worry to turn into pressure.",
    worldview:
      "We try to balance questioning ideas with respecting our family's cultural traditions. (Example text, written by the parent.)",
    nurturingGoals: ["critical_thinking", "independence"],
  },
  teen: {
    interests: "Coding small games, digital art, taking gadgets apart to see how they work.",
    strengths: "Problem solving, sticking with a hard bug, explaining ideas visually.",
    careerIdeas: "Game design or software engineering. I'm not sure about medicine.",
    aspirations: "Release a game that other people actually play.",
    goals: [
      { id: "t1", text: "Build and release a small game this term", status: "doing", shared: true },
      { id: "t2", text: "Learn basic 3D modelling", status: "todo", shared: false },
      { id: "t3", text: "Find a calm moment to talk with my parent about my future plans", status: "todo", shared: false },
    ],
    reflections: [
      {
        id: "r1",
        text: "I get nervous bringing up game design because I think my parent hopes for something different.",
      },
      { id: "r2", text: "Finishing my first level made me feel proud. I want to show it to someone." },
    ],
  },
  shared: {
    goals: [
      { id: "s1", text: "A relaxed 20-minute family check-in each week", status: "doing", shared: true },
      { id: "s2", text: "Visit a local tech or maker event together", status: "todo", shared: true },
    ],
    routines: "Sunday dinner together with phones away.",
    commitments: "We each listen fully before responding. We revisit big decisions after a night's sleep.",
  },
};
