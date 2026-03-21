/**
 * Community Guidelines
 * A clean, document-style page outlining norms for The Gathering Grove.
 */

import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";

interface SectionProps {
  number: string;
  title: string;
  children: ReactNode;
}

function Section({ number, title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "10px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#7dd87d",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {number}
        </span>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#1a472a",
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ color: "#374b3e", fontSize: "15px", lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

export default function CommunityGuidelines() {
  return (
    <>
      <SEO
        title="Community Guidelines — The Gathering Grove"
        description="How we show up for each other in The Gathering Grove regenerative civics community."
      />

      <div
        style={{
          minHeight: "100vh",
          background: "#f8faf8",
          padding: "40px 20px 80px",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* Back link */}
          <Link
            href="/community"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#4a7c59",
              fontSize: "13px",
              textDecoration: "none",
              marginBottom: "32px",
            }}
          >
            <ArrowLeft size={14} />
            Back to Community
          </Link>

          {/* Page header */}
          <div style={{ marginBottom: "48px", borderBottom: "2px solid #e2ece4", paddingBottom: "28px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#7dd87d",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                margin: "0 0 8px",
              }}
            >
              The Gathering Grove
            </p>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#1a472a",
                margin: "0 0 12px",
                lineHeight: 1.2,
              }}
            >
              Community Guidelines
            </h1>
            <p style={{ color: "#4a7c59", fontSize: "15px", margin: 0, lineHeight: 1.6 }}>
              This is a space for people building a regenerative world. These guidelines help us keep it honest, generous, and worth showing up for.
            </p>
          </div>

          {/* Section 1 */}
          <Section number="01" title="Our values">
            <ul style={{ margin: "0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                <strong>Honesty.</strong> Share what you actually experienced, believe, or don't know. Uncertainty is welcome here.
              </li>
              <li>
                <strong>Respect.</strong> Every person in this space is doing their best with what they have.
              </li>
              <li>
                <strong>Curiosity.</strong> Ask questions before assuming. Learning together is the point.
              </li>
              <li>
                <strong>Regeneration.</strong> We care about outcomes that restore rather than extract — in our land practices and in how we treat each other.
              </li>
            </ul>
          </Section>

          {/* Section 2 */}
          <Section number="02" title="What makes a good post">
            <ul style={{ margin: "0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                <strong>A clear title.</strong> Help people decide if they want to read more before they click.
              </li>
              <li>
                <strong>Enough context.</strong> Don't assume everyone knows your situation. A sentence or two of background goes a long way.
              </li>
              <li>
                <strong>The right category.</strong> Posting in the right place helps the people most likely to care find your post.
              </li>
              <li>
                <strong>Staying on topic.</strong> If a conversation takes a new direction, start a new thread.
              </li>
            </ul>
          </Section>

          {/* Section 3 */}
          <Section number="03" title="How we handle disagreement">
            <p style={{ margin: "0 0 12px" }}>
              Disagreement is normal and often useful. The way we disagree matters more than whether we disagree.
            </p>
            <ul style={{ margin: "0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>Address the idea, not the person who holds it.</li>
              <li>Ask a question before assuming someone meant harm.</li>
              <li>It's okay to say "I see this differently" and leave it there.</li>
              <li>If a conversation has become unproductive, step away and come back later.</li>
            </ul>
          </Section>

          {/* Section 4 */}
          <Section number="04" title="What we don't allow">
            <ul style={{ margin: "0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                <strong>Spam.</strong> Repeated low-effort posts, irrelevant links, or automated content.
              </li>
              <li>
                <strong>Self-promotion without contribution.</strong> Share your work — but be a part of conversations, not just a sender of them.
              </li>
              <li>
                <strong>Personal attacks.</strong> Criticise positions, not people.
              </li>
              <li>
                <strong>Misinformation.</strong> If you're sharing something as fact, be prepared to back it up. If it's opinion, say so.
              </li>
            </ul>
          </Section>

          {/* Section 5 */}
          <Section number="05" title="How to flag an issue">
            <p style={{ margin: "0 0 12px" }}>
              Every post and reply has a flag button. Use it if you see something that violates these guidelines or makes the space feel unsafe. You don't have to explain yourself — a flag is enough to start a review.
            </p>
            <p style={{ margin: 0 }}>
              Flagging is not a vote. It's a request for a human to take a look.
            </p>
          </Section>

          {/* Section 6 */}
          <Section number="06" title="Moderation">
            <p style={{ margin: "0 0 12px" }}>
              Our team reviews all flags, usually within a day or two. We may remove content, reach out to the author, or take no action depending on what we find.
            </p>
            <p style={{ margin: 0 }}>
              We apply these guidelines with judgment, not a checklist. If you ever want to talk through a moderation decision, reach out via the community forum or use the contact link in the footer.
            </p>
          </Section>

          {/* Footer note */}
          <div
            style={{
              borderTop: "1px solid #e2ece4",
              paddingTop: "24px",
              color: "#6a9a7a",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: "0 0 8px" }}>
              These guidelines will evolve as the community does. Changes will be announced in the forum.
            </p>
            <Link href="/community" style={{ color: "#4a7c59", textDecoration: "underline" }}>
              Return to the community
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
