import { sql } from "drizzle-orm";
import { db } from "../client.js";
import { companies, users } from "../schema.js";
import type { CompanyAnalysis } from "../../lib/types.js";

/** Full synthetic analysis matching `CompanyAnalysis` (stand-in for external company_output_example). */
export const vercelDemoAnalysis: CompanyAnalysis = {
  tagline: "Frontend cloud platform for deploying modern web apps at the edge.",
  what_they_do: [
    "Hosts Next.js, static sites, and serverless functions globally.",
    "Provides Git-based deploys, preview URLs, and edge middleware.",
    "Offers analytics, speed insights, and image optimization.",
    "Integrates with major frameworks and monorepos.",
  ],
  problem_solved: [
    "Teams struggle to ship fast without managing global infra.",
    "Cold starts and regional latency hurt user experience.",
    "CI/CD for frontends is fragmented across vendors.",
  ],
  ai_angle: [
    "Not an AI company — focuses on developer experience and edge compute.",
    "Partners with AI app builders who need reliable hosting for UIs.",
  ],
  competitive_position: [
    "Strong brand among React/Next.js developers.",
    "Differentiates on DX, preview deployments, and edge network.",
    "Competes with Netlify, Cloudflare Pages, and AWS Amplify.",
  ],
  competitors: [
    { name: "Netlify", notes: "Similar JAMstack positioning; strong in forms and edge functions." },
    { name: "Cloudflare Pages", notes: "Aggressive pricing and global network; Workers for compute." },
    { name: "AWS Amplify", notes: "Deeper AWS integration; heavier configuration." },
    { name: "Railway", notes: "Broader PaaS; less specialized for static/edge frontends." },
  ],
  customers: [
    {
      category: "Growth-stage SaaS",
      examples: ["Notion", "Linear", "Cal.com"],
    },
    {
      category: "Open source projects",
      examples: ["Next.js docs", "community templates"],
    },
  ],
  market_attractiveness: [
    "Large TAM as more teams adopt composable frontends.",
    "Tailwinds from Next.js adoption and edge rendering.",
    "Competitive intensity remains high among hosting vendors.",
  ],
  disruption_risks: [
    "Hyperscalers bundling hosting with enterprise contracts.",
    "Open-source self-hosting on Kubernetes for cost control.",
    "Commoditization of edge primitives reducing switching costs.",
  ],
  future_outlook: [
    "Continued investment in framework-led workflows (especially Next.js).",
    "Expansion into observability and security adjacent products.",
    "Enterprise features for compliance and SSO remain a focus.",
  ],
  bull_case: "Vercel becomes the default deployment path for modern JavaScript apps, expanding attach rate with analytics, security, and AI-adjacent tooling while keeping best-in-class DX.",
  bear_case: "Margins compress as cloud incumbents replicate core features; large customers multi-cloud or self-host, slowing net expansion within existing accounts.",
  feedback: {
    pros: ["Fast previews", "Great Next.js integration", "Solid global performance"],
    cons: ["Pricing at scale", "Complexity for non-Next stacks", "Support tiers vary"],
    source_url: "https://www.g2.com/products/vercel/reviews",
  },
  doc_url: "https://vercel.com/docs",
};

export const seedUsers = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "demo@companybrief.com",
    googleId: "google_demo_001",
    displayName: "Demo User",
    avatarUrl: null as string | null,
  },
];

export const seedCompanies = [
  {
    id: "00000000-0000-0000-0000-000000000010",
    userId: "00000000-0000-0000-0000-000000000001",
    name: "Vercel",
    slug: "vercel",
    status: "complete" as const,
    analysis: vercelDemoAnalysis,
    errorMessage: null as string | null,
  },
];

async function seed() {
  for (const u of seedUsers) {
    await db
      .insert(users)
      .values({
        id: u.id,
        email: u.email,
        googleId: u.googleId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: u.email,
          googleId: u.googleId,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          updatedAt: sql`now()`,
        },
      });
  }

  for (const c of seedCompanies) {
    await db
      .insert(companies)
      .values({
        id: c.id,
        userId: c.userId,
        name: c.name,
        slug: c.slug,
        status: c.status,
        analysis: c.analysis,
        errorMessage: c.errorMessage,
      })
      .onConflictDoUpdate({
        target: companies.id,
        set: {
          userId: c.userId,
          name: c.name,
          slug: c.slug,
          status: c.status,
          analysis: c.analysis,
          errorMessage: c.errorMessage,
          updatedAt: sql`now()`,
        },
      });
  }

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
