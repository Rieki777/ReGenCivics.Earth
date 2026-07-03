/**
 * User Forum Profile Page
 * Shows user's forum activity, stats, and profile info
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link, useParams, useLocation } from "wouter";
import { useState } from "react";
import {
  User, MessageSquare, Heart, Star, Calendar,
  MapPin, Globe, Edit2, ArrowLeft, Award, TrendingUp,
  VolumeX, Volume2
} from "lucide-react";
import { TaoSpinner } from "@/components/TaoSpinner";

export default function UserForumProfile() {
  const params = useParams<{ id: string }>();
  const userId = parseInt(params.id || '0');
  const { user: currentUser, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [location, setLocationVal] = useState('');
  const [website, setWebsite] = useState('');

  const profileQuery = trpc.forum.userProfile.useQuery({ userId }, { enabled: userId > 0 });
  const updateProfileMutation = trpc.forum.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      profileQuery.refetch();
    },
  });

  const isOwnProfile = currentUser?.id === userId;
  const data = profileQuery.data;

  // Person-level mute: their mentions/replies stop notifying or emailing you.
  const utils = trpc.useUtils();
  const { data: myMutes } = trpc.notifications.mutes.listMine.useQuery(undefined, {
    enabled: isAuthenticated && !isOwnProfile,
  });
  const isMuted = !!myMutes?.some(m => m.mutedUserId === userId);
  const invalidateMutes = () => utils.notifications.mutes.listMine.invalidate();
  const setMuteMutation = trpc.notifications.mutes.set.useMutation({ onSuccess: invalidateMutes });
  const removeMuteMutation = trpc.notifications.mutes.remove.useMutation({ onSuccess: invalidateMutes });

  if (profileQuery.isLoading) {
    return <TaoSpinner fullPage size={72} />;
  }

  if (!data?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818] flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-white/60 mx-auto mb-4" />
          <h2 className="text-white/60 text-lg mb-4">User not found</h2>
          <Link href="/community" className="text-[#7dd87d] hover:underline">Back to Forum</Link>
        </div>
      </div>
    );
  }

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ bio, location: location, website });
  };

  // Reputation level
  const rep = data.stats.reputation;
  const level = rep >= 100 ? 'Elder' : rep >= 50 ? 'Guide' : rep >= 20 ? 'Grower' : rep >= 5 ? 'Seedling' : 'Sprout';
  const levelColor = rep >= 100 ? 'text-yellow-400' : rep >= 50 ? 'text-purple-400' : rep >= 20 ? 'text-blue-400' : rep >= 5 ? 'text-green-400' : 'text-white/60';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO title={`${data.user.name || 'User'} | ReGen Civics Forum`} description={`Forum profile for ${data.user.name}`} />

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        {/* Back Link */}
        <Link href="/community" className="inline-flex items-center gap-2 text-[#7dd87d]/70 hover:text-[#7dd87d] text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Forum
        </Link>

        {/* Profile Header */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7dd87d] to-[#4a7c59] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {(data.user.name || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  {data.user.name || 'Anonymous'}
                </h1>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 ${levelColor}`}>
                  {level}
                </span>
              </div>
              <p className="text-white/70 text-sm">
                Joined {new Date(data.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              {data.profile?.bio && !isEditing && (
                <p className="text-white/70 text-sm mt-2">{data.profile.bio}</p>
              )}
              {data.profile?.location && !isEditing && (
                <p className="text-white/70 text-xs mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {data.profile.location}
                </p>
              )}
              {data.profile?.website && !isEditing && (
                <a href={data.profile.website} target="_blank" rel="noopener noreferrer" className="text-[#7dd87d] text-xs mt-1 flex items-center gap-1 hover:underline">
                  <Globe className="w-3 h-3" /> {data.profile.website}
                </a>
              )}
            </div>
            {isOwnProfile && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBio(data.profile?.bio || '');
                  setLocationVal(data.profile?.location || '');
                  setWebsite(data.profile?.website || '');
                  setIsEditing(true);
                }}
                className="border-white/20 text-white/70 hover:bg-white/10"
              >
                <Edit2 className="w-3 h-3 mr-1" /> Edit
              </Button>
            )}
            {!isOwnProfile && isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isMuted) {
                    removeMuteMutation.mutate({ mutedUserId: userId });
                  } else {
                    setMuteMutation.mutate({ mutedUserId: userId, scope: 'both' });
                  }
                }}
                className="border-white/20 text-white/70 hover:bg-white/10"
                aria-pressed={isMuted}
                title={isMuted ? 'Their mentions and replies will notify you again' : 'Their mentions and replies will stop notifying you'}
              >
                {isMuted ? <><Volume2 className="w-3 h-3 mr-1" /> Unmute</> : <><VolumeX className="w-3 h-3 mr-1" /> Mute</>}
              </Button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              <div>
                <label className="text-white/60 text-xs mb-1 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7dd87d]/50 resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocationVal(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7dd87d]/50"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#7dd87d]/50"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="border-white/20 text-white/70">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={updateProfileMutation.isPending} className="bg-[#7dd87d] text-[#1a472a]">
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: <MessageSquare className="w-5 h-5" />, label: 'Posts', value: data.stats.postCount },
            { icon: <MessageSquare className="w-5 h-5" />, label: 'Replies', value: data.stats.replyCount },
            { icon: <Heart className="w-5 h-5" />, label: 'Likes Received', value: data.stats.likesReceived },
            { icon: <Star className="w-5 h-5" />, label: 'Reputation', value: data.stats.reputation },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-[#7dd87d] mb-1 flex justify-center">{stat.icon}</div>
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-white/70 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Posts */}
        {data.recentPosts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Recent Posts
            </h2>
            <div className="space-y-2">
              {data.recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/p/${post.id}`}
                  className="block bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl p-4 transition-colors"
                >
                  <h3 className="text-white font-medium text-sm mb-1">{post.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-white/60">
                    <span>{post.replyCount} replies</span>
                    <span>{post.viewCount} views</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Replies */}
        {data.recentReplies.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Recent Replies
            </h2>
            <div className="space-y-2">
              {data.recentReplies.map((reply) => (
                <Link
                  key={reply.id}
                  href={`/community/p/${reply.postId}`}
                  className="block bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl p-4 transition-colors"
                >
                  <p className="text-white/70 text-sm line-clamp-2">{reply.content}</p>
                  <div className="flex items-center gap-3 text-xs text-white/60 mt-1">
                    <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
