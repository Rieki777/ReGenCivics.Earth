/**
 * HowToApplySection - The 5-step process for applying to game roles.
 * Used on the Team page after the Seasonal Rhythm section.
 */
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    num: 1,
    title: "Choose a role and prepare your pitch",
    desc: "Pick a role from the list above. Read its powers, responsibilities, and seasonal activity. Think about what you'd bring to it this coming season and what specific outcomes you'd commit to delivering.",
    highlight: false,
  },
  {
    num: 2,
    title: "Record a 3-minute video introduction",
    desc: "Tell us who you are, why this role calls to you, what relevant experience you bring, and what you'd deliver this season. Keep it real. We care about the person behind the pitch, not the polish.",
    highlight: false,
  },
  {
    num: 3,
    title: "Submit your application",
    desc: "Applications open at the Season Festival. Submit your video pitch and a written summary through the application form. The team reviews applications monthly during active seasons, and seasonally during quieter ones.",
    highlight: false,
  },
  {
    num: 4,
    title: "Community vote",
    desc: "All Voice Holders vote on role assignments. Voting happens on Hypha, where every proposal is transparent and every vote is recorded. The community decides who plays what role.",
    highlight: false,
  },
  {
    num: 5,
    title: "Play your role",
    desc: "Once approved, you hold the role for the season. Your contributions are tracked, your $ReGen tokens accumulate, and at the end of the season the community evaluates outcomes during the next Season Festival.",
    highlight: true,
  },
];

export function HowToApplySection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            How to <span className="text-[#7dd87d]">Apply</span>
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            You pitch for a role for a season. Here's the process.
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`backdrop-blur-sm rounded-2xl p-6 flex items-start gap-4 ${
                step.highlight
                  ? "bg-gradient-to-r from-[#7dd87d]/20 via-[#7dd87d]/10 to-[#7dd87d]/20 border border-[#7dd87d]/30"
                  : "bg-white/5 border border-[#7dd87d]/20"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                  step.highlight
                    ? "bg-[#7dd87d] text-[#1a472a]"
                    : "bg-[#7dd87d]/20 text-[#7dd87d]"
                }`}
              >
                {step.num}
              </div>
              <div>
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-white/60 text-sm">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/connect?path=role">
            <Button
              size="lg"
              className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] rounded-xl"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Apply for a Role <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
