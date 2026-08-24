export type AiLanguage = "es" | "en";

export type AiRecommendation = {
  section: string;
  priority: "high" | "medium" | "low";
  issue: string;
  evidence: string;
  recommendation: string;
  improvedExample: string;
};

export type BuilderResumeDraft = {
  personal: {
    fullName: string;
    role: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    summary: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  experience: Array<{
    company: string;
    position: string;
    location: string;
    startDate: string;
    endDate: string;
    responsibilities: string;
  }>;
  skills: {
    technical: string;
    languages: string;
    additional: string;
    certifications: Array<{ name: string; date: string }>;
  };
  noExperience: boolean;
};

export type AiResumeResult = {
  headline: string;
  overallAssessment: string;
  targetRole: string;
  recommendations: AiRecommendation[];
  keywords: {
    matched: string[];
    missing: string[];
    advice: string[];
  };
  improvedResume: string;
  factsToVerify: string[];
  builderData: BuilderResumeDraft;
};

const string = { type: "string" } as const;

export const AI_RESUME_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: string,
    overallAssessment: string,
    targetRole: string,
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          section: string,
          priority: { type: "string", enum: ["high", "medium", "low"] },
          issue: string,
          evidence: string,
          recommendation: string,
          improvedExample: string,
        },
        required: ["section", "priority", "issue", "evidence", "recommendation", "improvedExample"],
      },
    },
    keywords: {
      type: "object",
      additionalProperties: false,
      properties: {
        matched: { type: "array", items: string },
        missing: { type: "array", items: string },
        advice: { type: "array", items: string },
      },
      required: ["matched", "missing", "advice"],
    },
    improvedResume: string,
    factsToVerify: { type: "array", items: string },
    builderData: {
      type: "object",
      additionalProperties: false,
      properties: {
        personal: {
          type: "object",
          additionalProperties: false,
          properties: {
            fullName: string,
            role: string,
            email: string,
            phone: string,
            location: string,
            website: string,
            linkedin: string,
            summary: string,
          },
          required: ["fullName", "role", "email", "phone", "location", "website", "linkedin", "summary"],
        },
        education: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              institution: string,
              degree: string,
              location: string,
              startDate: string,
              endDate: string,
              description: string,
            },
            required: ["institution", "degree", "location", "startDate", "endDate", "description"],
          },
        },
        experience: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              company: string,
              position: string,
              location: string,
              startDate: string,
              endDate: string,
              responsibilities: string,
            },
            required: ["company", "position", "location", "startDate", "endDate", "responsibilities"],
          },
        },
        skills: {
          type: "object",
          additionalProperties: false,
          properties: {
            technical: string,
            languages: string,
            additional: string,
            certifications: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: { name: string, date: string },
                required: ["name", "date"],
              },
            },
          },
          required: ["technical", "languages", "additional", "certifications"],
        },
        noExperience: { type: "boolean" },
      },
      required: ["personal", "education", "experience", "skills", "noExperience"],
    },
  },
  required: ["headline", "overallAssessment", "targetRole", "recommendations", "keywords", "improvedResume", "factsToVerify", "builderData"],
} as const;
