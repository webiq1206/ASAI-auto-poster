interface ScoringInput {
  messageContent: string;
  existingScore: number;
  existingData: Record<string, number>;
}

interface ScoringResult {
  score: number;
  qualification: "cold" | "warm" | "qualified";
  data: Record<string, number>;
}

const SCORING_RULES = [
  { key: "budget_mention", pattern: /budget|afford|spend|price range|\$\d/i, points: 20 },
  { key: "timeline_mention", pattern: /today|tomorrow|this week|asap|soon|ready to buy|looking to buy/i, points: 30 },
  { key: "phone_provided", pattern: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, points: 15 },
  { key: "appointment_interest", pattern: /come in|visit|test drive|schedule|appointment|when.*open/i, points: 25 },
  { key: "engagement", pattern: /.+/, points: 10 },
];

export function scoreLead(input: ScoringInput): ScoringResult {
  const data = { ...input.existingData };

  for (const rule of SCORING_RULES) {
    if (rule.pattern.test(input.messageContent) && !data[rule.key]) {
      data[rule.key] = rule.points;
    }
  }

  const score = Math.min(100, Object.values(data).reduce((a, b) => a + b, 0));

  let qualification: ScoringResult["qualification"] = "cold";
  if (score >= 60) qualification = "qualified";
  else if (score >= 40) qualification = "warm";

  return { score, qualification, data };
}
