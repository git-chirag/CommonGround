// Links to the pages behind CommonGround's curated library. Descriptions are our own short words
// and say only what we saw on each page. Keep in sync with backend/data/corpus/*.md.
export interface Resource {
  title: string;
  publisher: string;
  url: string;
  note: string;
}

export const RESOURCES: Resource[] = [
  {
    title: "Teens and risky behaviour",
    publisher: "UNICEF Parenting",
    url: "https://www.unicef.org/parenting/mental-health/teens-risky-behaviours",
    note: "Being a partner in your teen's safety, and planning ahead for parties and time with friends.",
  },
  {
    title: "Tips for Parents and Caregivers to Support Adolescents",
    publisher: "UNICEF India",
    url: "https://www.unicef.org/india/stories/tips-parents-and-caregivers-support-adolescents",
    note: "Listening without judging, handling disagreements calmly, and respecting growing independence.",
  },
  {
    title: "11 tips for communicating with your teen",
    publisher: "UNICEF",
    url: "https://www.unicef.org/eca/11-tips-communicating-your-teen",
    note: "Listening, open questions and validation when you and your teen see things differently.",
  },
  {
    title: "Parenting of Adolescents",
    publisher: "UNICEF (February 2021)",
    url: "https://www.unicef.org/reports/parenting-adolescents",
    note: "How the parenting relationship changes in adolescence.",
  },
  {
    title: "Positive Parenting Tips: Young Teens (12-14)",
    publisher: "CDC",
    url: "https://www.cdc.gov/child-development/positive-parenting-tips/young-teens-12-14-years.html",
    note: "Age-by-age tips from the CDC. Teens make more of their own choices as they become independent.",
  },
  {
    title: "Serve and Return",
    publisher: "Center on the Developing Child, Harvard University",
    url: "https://developingchild.harvard.edu/key-concept/serve-and-return/",
    note: "Responsive back-and-forth interactions with young children.",
  },
  {
    title: "Executive Function: Skills for Life and Learning",
    publisher: "Center on the Developing Child, Harvard University",
    url: "https://developingchild.harvard.edu/resources/inbrief-executive-function-skills/",
    note: "Focus, planning and self-regulation skills and how they develop.",
  },
];
