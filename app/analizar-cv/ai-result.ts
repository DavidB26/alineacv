export type AiLanguage = "es" | "en";

export const JOB_INDUSTRIES = [
  "admin-support",
  "business",
  "copywriting",
  "design-multimedia",
  "supporting",
  "cybersecurity",
  "data-science",
  "admin",
  "education",
  "accounting-finance",
  "healthcare",
  "hr",
  "legal",
  "marketing",
  "management",
  "project-management",
  "qa-testing",
  "seller",
  "seo",
  "engineering",
  "technical-support",
  "web-app-design",
] as const;

export type JobIndustry = typeof JOB_INDUSTRIES[number];

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
  compatibility: {
    score: number;
    matchedRequirements: string[];
    missingRequirements: string[];
    transferableStrengths: string[];
    explanation: string;
  };
  jobSearch: {
    query: string;
    industry: JobIndustry;
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
    compatibility: {
      type: "object",
      additionalProperties: false,
      properties: {
        score: { type: "integer", minimum: 0, maximum: 100 },
        matchedRequirements: { type: "array", items: string },
        missingRequirements: { type: "array", items: string },
        transferableStrengths: { type: "array", items: string },
        explanation: string,
      },
      required: ["score", "matchedRequirements", "missingRequirements", "transferableStrengths", "explanation"],
    },
    jobSearch: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: string,
        industry: { type: "string", enum: JOB_INDUSTRIES },
      },
      required: ["query", "industry"],
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
  required: ["headline", "overallAssessment", "targetRole", "recommendations", "keywords", "compatibility", "jobSearch", "improvedResume", "factsToVerify", "builderData"],
} as const;
