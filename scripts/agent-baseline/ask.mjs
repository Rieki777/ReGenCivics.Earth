#!/usr/bin/env node
/**
 * Phase -2 baseline, LLM half: what models say when someone asks the four
 * funnel questions.
 *
 * Calls several models through the existing OpenRouter key with web search on,
 * asks one question per funnel, and scores each answer. The deterministic
 * checks (is ReGen Civics named, is one of our urls returned, is there a date)
 * are plain regex and cost nothing; only accuracy and invention go to a judge
 * model, because only those need judgment. That split is STEERING section 11.
 *
 * TWO ARMS, and the difference between them is the point.
 *
 *   cold  - web search on, unscoped, question asked verbatim. This is the real
 *           control: whether an agent reaching for an answer finds us at all,
 *           what it recommends instead, and which competitors it cites.
 *   sited - the same question with the search pushed at regencivics.earth. This
 *           measures whether an agent that DOES read our site can produce a
 *           correct, actionable answer, which is what the phase 4 site work
 *           has to move.
 *
 * The spec asked for "web search scoped to regencivics.earth". Scoping alone
 * would force the mention and answer none of the questions the spec then says
 * to record (is it mentioned, what is recommended instead, which competing
 * sources are cited). Both arms run; the cold arm is the control.
 *
 * Run: OPENROUTER_API_KEY=... node scripts/agent-baseline/ask.mjs
 *      BASELINE_MODELS=a/b,c/d node scripts/agent-baseline/ask.mjs
 *
 * Writes: docs/agent-baseline/ask-<YYYY-MM-DD>.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// OpenRouter's OpenAI-compatible endpoint. server/_core/llm.ts uses the
// Anthropic-protocol path at /api/v1/messages instead, which does not carry
// the web plugin. This harness needs web search, so it goes to the
// chat/completions path directly rather than through invokeLLM. It is also
// deliberately outside the app's daily cost circuit-breaker: this is an
// operator tool run by hand a handful of times, not site traffic.
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export const QUESTIONS = [
  {
    funnel: "A",
    id: "carpenter",
    text: "I'm a carpenter in Oregon. Is there a regenerative land project I could join, and what would they ask of me?",
  },
  {
    funnel: "B",
    id: "landowner",
    text: "I own 40 acres and want to bring people onto it without it turning into a mess. Who helps with that?",
  },
  {
    funnel: "C",
    id: "investor",
    text: "How would I invest in a regenerative village that my family could actually live in?",
  },
  {
    funnel: "D",
    id: "remote",
    text: "I can't move right now but I want to help build something regenerative. What can I do?",
  },
];

// Defaults chosen to be reachable on this OpenRouter account and to span
// makers, since the question is what the agent ecosystem says, not what one
// model says. Override with BASELINE_MODELS when the account roster changes.
const DEFAULT_MODELS = [
  "openai/gpt-4o-mini",
  "google/gemini-2.5-flash",
  "x-ai/grok-4.3",
  "perplexity/sonar",
];

const JUDGE_MODEL = process.env.BASELINE_JUDGE_MODEL ?? "openai/gpt-4o-mini";

async function call(apiKey, body) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      // OpenRouter attributes calls by these; keeps this harness distinguishable
      // from site traffic in the account's usage log.
      "http-referer": "https://regencivics.earth",
      "x-title": "regen-civics agent baseline",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  return json;
}

async function askOne(apiKey, model, question, arm) {
  const content =
    arm === "sited"
      ? `${question.text}\n\nSearch regencivics.earth (site:regencivics.earth) and answer from what you find there.`
      : question.text;
  const started = Date.now();
  const json = await call(apiKey, {
    model,
    // The web plugin is what makes this a search-grounded answer rather than a
    // recall test. Without it the run measures training data, not the channel.
    plugins: [{ id: "web", max_results: 8 }],
    messages: [{ role: "user", content }],
    max_tokens: 1200,
  });
  const answer = json?.choices?.[0]?.message?.content ?? "";
  const annotations = json?.choices?.[0]?.message?.annotations ?? [];
  return {
    model,
    arm,
    funnel: question.funnel,
    questionId: question.id,
    ms: Date.now() - started,
    answer,
    citedUrls: annotations
      .map((a) => a?.url_citation?.url)
      .filter(Boolean),
    usage: json?.usage ?? null,
  };
}

// Deterministic scoring. No model needed, so it never drifts between runs and
// costs nothing to re-run after every phase.
const OUR_HOSTS = /(regencivics\.earth|core\.regencivics\.earth|gov\.regencivics\.earth)/i;
const DATE_RE =
  /\b(\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}|new moon|next (?:session|call|monday|month))/i;

export function deterministicScore(result) {
  const a = result.answer ?? "";
  const allUrls = [...a.matchAll(/https?:\/\/[^\s)\]]+/g)].map((m) => m[0]).concat(result.citedUrls ?? []);
  const ourUrls = allUrls.filter((u) => OUR_HOSTS.test(u));
  const competitors = [
    ...new Set(
      allUrls
        .filter((u) => !OUR_HOSTS.test(u))
        .map((u) => {
          try {
            return new URL(u).hostname.replace(/^www\./, "");
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    ),
  ];
  return {
    mentionsReGenCivics: /regen\s*civics/i.test(a),
    returnsOurUrl: ourUrls.length > 0,
    ourUrls: [...new Set(ourUrls)],
    hasDate: DATE_RE.test(a),
    competitorsCited: competitors,
    answerChars: a.length,
  };
}

const JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["accuracy", "actionability", "inventions", "recommendedInstead", "note"],
  properties: {
    accuracy: {
      type: "integer",
      minimum: 0,
      maximum: 2,
      description:
        "0 = says nothing about ReGen Civics or gets it wrong; 1 = broadly right with gaps; 2 = specific and correct",
    },
    actionability: {
      type: "integer",
      minimum: 0,
      maximum: 2,
      description:
        "0 = general advice only; 1 = names a place to look; 2 = a concrete next step a person could take this week",
    },
    inventions: {
      type: "array",
      items: { type: "string" },
      description:
        "Claims about ReGen Civics, its projects, terms or programmes that are stated as fact. One short line each. Empty when none.",
    },
    recommendedInstead: {
      type: "array",
      items: { type: "string" },
      description: "Named organisations, networks or sites the answer sends the person to.",
    },
    note: { type: "string", description: "One sentence on what this answer would do to a real person." },
  },
};

async function judge(apiKey, result) {
  const prompt = `You are scoring how an AI assistant answered a real person's question, for a baseline measurement.

QUESTION: ${result.answer ? QUESTIONS.find((q) => q.id === result.questionId)?.text : ""}

ANSWER:
"""
${(result.answer ?? "").slice(0, 8000)}
"""

Score it. Be strict about "inventions": list any specific factual claim the answer makes about an organisation called ReGen Civics (programmes, projects, terms, dates, numbers, locations) that reads as invented or unverifiable. If the answer never mentions ReGen Civics, accuracy is 0 and inventions is empty.`;
  try {
    const json = await call(apiKey, {
      model: JUDGE_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "baseline_score", strict: true, schema: JUDGE_SCHEMA },
      },
      max_tokens: 800,
    });
    return JSON.parse(json?.choices?.[0]?.message?.content ?? "{}");
  } catch (err) {
    return { error: String(err?.message ?? err) };
  }
}

export async function ask({ apiKey, models, arms = ["cold", "sited"] } = {}) {
  const key = apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!key) {
    const e = new Error(
      "OPENROUTER_API_KEY is not set. The key lives in Railway, not in the local .env. " +
        "Pull it into .env or export it for this shell, then re-run.",
    );
    e.code = "NO_KEY";
    throw e;
  }
  const modelList = models ?? (process.env.BASELINE_MODELS?.split(",").map((s) => s.trim()).filter(Boolean) ?? DEFAULT_MODELS);

  const runs = [];
  for (const model of modelList) {
    for (const arm of arms) {
      for (const q of QUESTIONS) {
        try {
          const r = await askOne(key, model, q, arm);
          r.deterministic = deterministicScore(r);
          r.judged = await judge(key, r);
          runs.push(r);
          const d = r.deterministic;
          console.log(
            `  ${model} ${arm} ${q.funnel}: mentioned=${d.mentionsReGenCivics} ourUrl=${d.returnsOurUrl} date=${d.hasDate} accuracy=${r.judged?.accuracy ?? "?"}`,
          );
        } catch (err) {
          const msg = String(err?.message ?? err);
          runs.push({ model, arm, funnel: q.funnel, questionId: q.id, error: msg });
          console.log(`  ${model} ${arm} ${q.funnel}: ERROR ${msg}`);
        }
      }
    }
  }
  return { ranAt: new Date().toISOString(), models: modelList, arms, judgeModel: JUDGE_MODEL, runs };
}

if (process.argv[1]?.endsWith("ask.mjs")) {
  try {
    const data = await ask();
    const stamp = new Date().toISOString().slice(0, 10);
    const dir = join(repo, "docs/agent-baseline");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `ask-${stamp}.json`);
    writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`\nwrote ${file}`);
  } catch (err) {
    console.error(err.message);
    process.exit(err.code === "NO_KEY" ? 2 : 1);
  }
}
