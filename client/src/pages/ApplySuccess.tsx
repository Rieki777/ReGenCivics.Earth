import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Home, FileText } from "lucide-react";
import { Link } from "wouter";
import { BackButton } from "@/components/BackButton";

export default function ApplySuccess() {
  return (
    <div className="min-h-screen bg-[#f0ebe3] flex items-center justify-center py-12">
      <BackButton />
      <div className="container max-w-2xl">
        <Card className="p-8 md:p-12 text-center bg-white">
          <div className="w-20 h-20 rounded-full bg-[#7dd87d] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-4">
            Application Submitted!
          </h1>

          <p className="text-lg text-[#1a472a]/80 mb-6">
            Thank you for applying to the ReGen Civics next Season. We've received your application and our team will review it carefully.
          </p>

          <div className="bg-[#f0f7f0] border-2 border-[#7dd87d]/50 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-bold text-[#1a472a] mb-3">What happens next?</h2>
            <ul className="space-y-2 text-[#1a472a]/80">
              <li className="flex items-start gap-2">
                <span className="text-[#7dd87d] mt-1">✓</span>
                <span>Our team will review your application within 1-2 weeks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7dd87d] mt-1">✓</span>
                <span>You'll receive an email with the review decision</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7dd87d] mt-1">✓</span>
                <span>If approved, you'll be invited to join the next Season cohort</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#7dd87d] mt-1">✓</span>
                <span>You can view your application status in your dashboard</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link href="/my-applications">
              <Button variant="outline" className="border-[#1a472a]/30">
                <FileText className="w-4 h-4 mr-2" />
                View My Applications
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
