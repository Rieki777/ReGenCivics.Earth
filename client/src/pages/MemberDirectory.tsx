/**
 * Member Directory
 * Searchable, filterable grid of community members with player profiles.
 */

import { useState } from "react";
import { Link } from "wouter";
import { Search, Leaf, MessageSquare, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";

const FOCUS_AREAS = ["Land", "Water", "Energy", "Food", "Governance", "Culture", "Finance"];

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface MemberCardProps {
  member: {
    userId: number;
    displayName?: string | null;
    avatarUrl?: string | null;
    questInterests?: string | null;
    bio?: string | null;
  };
}

function MemberCard({ member }: MemberCardProps) {
  const interests = member.questInterests
    ? member.questInterests
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8e4",
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.displayName ?? "Member"}
            style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#1a472a",
              color: "#7dd87d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "16px",
              flexShrink: 0,
            }}
          >
            {getInitials(member.displayName)}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontWeight: 600,
              color: "#1a472a",
              fontSize: "15px",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {member.displayName ?? "Community Member"}
          </p>
        </div>
      </div>

      {/* Focus area chips */}
      {interests.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {interests.slice(0, 4).map((interest) => (
            <span
              key={interest}
              style={{
                background: "#f0f7f0",
                color: "#4a7c59",
                border: "1px solid #c8e6c8",
                borderRadius: "99px",
                padding: "2px 10px",
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              {interest}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
        <Link
          href={`/messages?userId=${member.userId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            border: "1px solid #c8e6c8",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            color: "#4a7c59",
            textDecoration: "none",
            background: "#f0f7f0",
          }}
        >
          <MessageSquare size={13} />
          Message
        </Link>
        <Link
          href={`/profile?userId=${member.userId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 12px",
            border: "1px solid #1a472a",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            color: "#fff",
            textDecoration: "none",
            background: "#1a472a",
          }}
        >
          <User size={13} />
          View Profile
        </Link>
      </div>
    </div>
  );
}

export default function MemberDirectory() {
  const [search, setSearch] = useState("");
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const LIMIT = 24;

  const { data, isLoading } = trpc.userProfiles.list.useQuery({
    search: search.trim() || undefined,
    interests: selectedInterest ?? undefined,
    limit: LIMIT,
    cursor,
  });

  const members = data?.members ?? [];
  const nextCursor = data?.nextCursor ?? null;

  return (
    <>
      <SEO
        title="Members: The Gathering Grove"
        description="Browse community members of the regenerative civics network."
      />

      <div
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(to bottom, #1a472a, #2d5a3d, #1a472a)",
          padding: "0 0 60px",
        }}
      >
        {/* Header */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 0" }}>
          <BackButton />
          <h1
            style={{
              color: "#fff",
              fontSize: "28px",
              fontWeight: 700,
              margin: "16px 0 4px",
            }}
          >
            Members
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", margin: "0 0 24px" }}>
            People building a regenerative world.
          </p>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 420, marginBottom: "16px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)",
              }}
            />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCursor(0); }}
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Focus area filter chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
            {FOCUS_AREAS.map((area) => (
              <button
                key={area}
                onClick={() => {
                  setSelectedInterest(selectedInterest === area ? null : area);
                  setCursor(0);
                }}
                style={{
                  padding: "5px 14px",
                  borderRadius: "99px",
                  border: selectedInterest === area ? "1px solid #7dd87d" : "1px solid rgba(255,255,255,0.2)",
                  background: selectedInterest === area ? "#7dd87d" : "rgba(255,255,255,0.07)",
                  color: selectedInterest === area ? "#1a472a" : "rgba(255,255,255,0.7)",
                  fontSize: "12px",
                  fontWeight: selectedInterest === area ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {area}
              </button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 0",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <Leaf size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ fontSize: "14px", margin: 0 }}>No members found.</p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "16px",
                }}
              >
                {members.map((member) => (
                  <MemberCard key={member.userId} member={member} />
                ))}
              </div>

              {/* Load more */}
              {nextCursor !== null && (
                <div style={{ textAlign: "center", marginTop: "32px" }}>
                  <button
                    onClick={() => setCursor(nextCursor)}
                    style={{
                      padding: "10px 28px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
