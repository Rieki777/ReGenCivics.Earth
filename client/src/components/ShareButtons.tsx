import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  Share2, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Link2, 
  Mail,
  Code
} from "lucide-react";
import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  className?: string;
  showEmbed?: boolean;
}

export function ShareButtons({ 
  url, 
  title, 
  description = '', 
  hashtags = ['ReGenCivics', 'Regenerative'],
  className = '',
  showEmbed = false
}: ShareButtonsProps) {
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const hashtagString = hashtags.join(',');
  
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=${hashtagString}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  };
  
  const embedCode = `<iframe src="${fullUrl}?embed=true" width="100%" height="400" frameborder="0" style="border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></iframe>`;
  
  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };
  
  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400,scrollbars=yes');
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/*
          Solid deep forest, not an outline. This button sits on a white card
          between an outlined Follow and a sage Contribute; as `variant="outline"`
          with a 30%-opacity spring border it was very nearly invisible, which is
          what Rye reported. Sharing is the action that grows a campaign, so it
          gets the darkest weight in the row rather than the lightest.

          #1a472a / #0d2818 are forest.base and forest.deep from
          client/src/lib/design-tokens.ts, so scripts/check-palette.ts stays
          clean. White on #1a472a is about 11:1, comfortably past AA.
          `className` is applied last so a caller can still override.
        */}
        <Button
          size="sm"
          className={`bg-[#1a472a] text-white hover:bg-[#0d2818] border border-[#1a472a] shadow-sm ${className}`}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 mb-2">Share this campaign</p>
          
          {/* Social buttons */}
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="p-2 h-10 hover:bg-[#1da1f2]/10 hover:border-[#1da1f2]"
              onClick={() => openShareWindow(shareLinks.twitter)}
              title="Share on Twitter"
              aria-label="Share on Twitter"
            >
              <Twitter className="w-4 h-4 text-[#1da1f2]" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="p-2 h-10 hover:bg-[#4267b2]/10 hover:border-[#4267b2]"
              onClick={() => openShareWindow(shareLinks.facebook)}
              title="Share on Facebook"
              aria-label="Share on Facebook"
            >
              <Facebook className="w-4 h-4 text-[#4267b2]" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="p-2 h-10 hover:bg-[#0a66c2]/10 hover:border-[#0a66c2]"
              onClick={() => openShareWindow(shareLinks.linkedin)}
              title="Share on LinkedIn"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4 text-[#0a66c2]" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="p-2 h-10 hover:bg-gray-100"
              onClick={() => window.location.href = shareLinks.email}
              title="Share via Email"
              aria-label="Share via Email"
            >
              <Mail className="w-4 h-4 text-gray-600" />
            </Button>
          </div>
          
          {/* Copy link button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => copyToClipboard(fullUrl, 'Link copied to clipboard!')}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          
          {/* Embed code section */}
          {showEmbed && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowEmbedCode(!showEmbedCode)}
              >
                <Code className="w-4 h-4 mr-2" />
                {showEmbedCode ? 'Hide Embed Code' : 'Get Embed Code'}
              </Button>
              
              {showEmbedCode && (
                <div className="mt-2">
                  <textarea
                    readOnly
                    value={embedCode}
                    className="w-full h-20 text-xs p-2 bg-gray-50 border rounded-md font-mono resize-none"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs"
                    onClick={() => copyToClipboard(embedCode, 'Embed code copied!')}
                  >
                    Copy Embed Code
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
