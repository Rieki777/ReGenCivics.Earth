import { useAuth } from "@/_core/hooks/useAuth";
import { SEO, pageSEO } from "@/components/SEO";
import { JsonLD, schemas } from "@/components/JsonLD";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Loader2, Save, MapPin, Map as MapIcon, HelpCircle } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { MapView } from "@/components/Map";
import { DataProtectionBadge } from "@/components/DataProtectionBadge";
import { BackButton } from "@/components/BackButton";
import { BannerDisplay } from "@/components/BannerDisplay";
import { PageWrapper } from "@/components/PageWrapper";
import { analytics } from "@/lib/analytics";

type UploadedFile = {
  name: string;
  url: string;
  size: number;
  type: string;
};

type FormData = {
  projectName: string;
  projectType: "early_stage" | "mature" | "";
  location: string;
  latitude: number | null;
  longitude: number | null;
  country: string;
  vision: string;
  landStatus: "owned" | "leased" | "committed" | "seeking" | "";
  teamSize: number;
  teamDescription: string;
  // Project Size & Community Metrics
  projectSizeHectares: number | null;
  currentPeopleCount: number | null;
  currentHouseholdCount: number | null;
  intendedPeopleCount: number | null;
  intendedHouseholdCount: number | null;
  mixedUse: string[]; // ["residential", "commercial", "industrial"]
  meetingFrequency: "everyday" | "2_3x_week" | "weekly" | "2_3x_month" | "monthly" | "2_3x_year" | "yearly_plus" | "";
  dietaryPatterns: string[];
  // Values & Alignment
  regenerativePractices: string;
  governanceApproach: string;
  communityEngagement: string;
  timeCommitment: string;
  currentFunding: string;
  fundingNeeds: string;
  websiteUrl: string;
  videoUrl: string;
  additionalNotes: string;
  documents: UploadedFile[];
};

const LS_KEY = 'regen_apply_draft';

function loadDraft(): Partial<FormData> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const INITIAL_FORM_DATA: FormData = {
  projectName: "",
  projectType: "",
  location: "",
  latitude: null,
  longitude: null,
  country: "",
  vision: "",
  landStatus: "",
  teamSize: 2,
  teamDescription: "",
  // Project Size & Community Metrics
  projectSizeHectares: null,
  currentPeopleCount: null,
  currentHouseholdCount: null,
  intendedPeopleCount: null,
  intendedHouseholdCount: null,
  mixedUse: [],
  meetingFrequency: "",
  dietaryPatterns: [],
  // Values & Alignment
  regenerativePractices: "",
  governanceApproach: "",
  communityEngagement: "",
  timeCommitment: "",
  currentFunding: "",
  fundingNeeds: "",
  websiteUrl: "",
  videoUrl: "",
  additionalNotes: "",
  documents: [],
};

export default function Apply() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(() => {
    const draft = loadDraft();
    return draft ? { ...INITIAL_FORM_DATA, ...draft } : INITIAL_FORM_DATA;
  });
  const [draftRestored, setDraftRestored] = useState(() => loadDraft() !== null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showOptionalStep1, setShowOptionalStep1] = useState(false);
  const [showOptionalStep2, setShowOptionalStep2] = useState(false);

  // Fetch the user's extended profile for pre-fill
  const { data: userProfile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user,
  });

  // Pre-fill form from profile on first load (only if no draft was restored)
  useEffect(() => {
    if (!userProfile || draftRestored) return;
    setFormData(prev => ({
      ...prev,
      location: prev.location || userProfile.location || '',
      projectName: prev.projectName || userProfile.projectName || '',
    }));
  }, [userProfile]);

  // Autosave to localStorage (debounced 800ms) — docs/files excluded to avoid quota issues
  const lsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (lsTimerRef.current) clearTimeout(lsTimerRef.current);
    lsTimerRef.current = setTimeout(() => {
      try {
        const { documents: _docs, ...rest } = formData;
        localStorage.setItem(LS_KEY, JSON.stringify(rest));
      } catch { /* storage quota exceeded — ignore */ }
    }, 800);
    return () => { if (lsTimerRef.current) clearTimeout(lsTimerRef.current); };
  }, [formData]);

  const utils = trpc.useUtils();
  const createMutation = trpc.applications.create.useMutation();
  const updateMutation = trpc.applications.update.useMutation();
  const submitMutation = trpc.applications.submit.useMutation();

  const totalSteps = 5;
  const stepTitles = [
    "Basic Information",
    "Land & Team",
    "Values & Alignment",
    "Commitment & Resources",
    "Additional Information",
  ];

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveDraft = async () => {
    if (!applicationId) {
      // Create new application
      const result = await createMutation.mutateAsync({
        projectName: formData.projectName || "Untitled Project",
        projectType: formData.projectType || "early_stage",
        location: formData.location || "TBD",
      });
      analytics.applyStarted();
      setApplicationId(result.id);
      return result.id;
    } else {
      // Update existing application - filter out empty strings
      const updateData: any = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "documents") {
          // Store documents as JSON string
          updateData.documentsUrl = JSON.stringify(value);
        } else if (key === "mixedUse") {
          // Store mixedUse as JSON string
          updateData.mixedUse = JSON.stringify(value);
        } else if (key === "dietaryPatterns") {
          updateData.dietaryPatterns = JSON.stringify(value);
        } else if (value !== "" && value !== null && value !== undefined) {
          updateData[key] = value;
        }
      });
      await updateMutation.mutateAsync({
        id: applicationId,
        data: updateData,
      });
      return applicationId;
    }
  };

  const handleNext = async () => {
    await saveDraft();
    if (currentStep < totalSteps) {
      analytics.applyStepAdvanced(currentStep + 1);
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      const id = await saveDraft();
      await submitMutation.mutateAsync({ id });
      analytics.applyFormSubmitted();
      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
      navigate("/apply/success");
    } catch (err: any) {
      const msg = err?.message || "Submission failed. Please try again.";
      setSubmitError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
      <SEO {...pageSEO.apply} />
      <JsonLD data={schemas.faqPage([
        { question: "Who can apply to ReGen Civics?", answer: "Any regenerative land project (ecovillages, food forests, intentional communities, regenerative farms) can apply. Projects at any stage are welcome." },
        { question: "When do applications open?", answer: "Season 2 applications are currently being reviewed. Season 3 opens in 2026. Sign up to be notified when the next round opens." },
        { question: "Is there a fee to apply?", answer: "No. There is no fee to apply to the ReGen Civics program." },
        { question: "How long does the application process take?", answer: "The review process typically takes 4–8 weeks after submission. You will be notified by email of the decision." },
      ])} />
      <BackButton />
        <Loader2 className="w-8 h-8 animate-spin text-[#4a7c59]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0ebe3]">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1a472a] mb-4">Login Required</h2>
          <p className="text-[#1a472a] mb-6">
            You need to be logged in to submit an application.
          </p>
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
          >
            Login to Continue
          </Button>
        </Card>
      </div>
    );
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || submitMutation.isPending;

  return (
    <PageWrapper>
    <div className="min-h-screen bg-[#f0ebe3] py-12">
      <BannerDisplay bannerKey="apply-banner" />
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1a472a] mb-2">
            Apply for Next Season
          </h1>
          <p className="text-[#1a472a]">
            Join the ReGen Civics Alliance
          </p>
        </div>

        {/* Step progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#1a472a]/60">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm font-medium text-[#1a472a]">{stepTitles[currentStep - 1]}</span>
          </div>
          <div className="w-full bg-[#e8e4de] rounded-full h-1.5">
            <div
              className="bg-[#7dd87d] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Steps */}
        <Card className="p-8 bg-white">
          {/* Draft restored banner */}
          {draftRestored && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#4a7c59]/30 bg-[#f0f7f0] px-4 py-3 text-sm text-[#1a472a]">
              <span>Draft restored from your last session.</span>
              <button
                type="button"
                className="text-xs underline opacity-70 hover:opacity-100"
                onClick={() => {
                  setFormData(INITIAL_FORM_DATA);
                  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
                  setDraftRestored(false);
                }}
              >
                Clear &amp; start over
              </button>
            </div>
          )}

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Basic Information
              </h2>

              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => updateField("projectName", e.target.value)}
                  placeholder="Enter your project name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="projectType">Project Type *</Label>
                <Select
                  value={formData.projectType}
                  onValueChange={(value) => updateField("projectType", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early_stage">Early Stage</SelectItem>
                    <SelectItem value="mature">Mature</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-[#1a472a]/80 mt-1">
                  Early stage: Just past land acquisition. Mature: Established and ready for funding.
                </p>
              </div>

              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="City, Country"
                  className="mt-1"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowOptionalStep1(!showOptionalStep1)}
                className="flex items-center gap-2 text-sm text-[#4a7c59] hover:text-[#1a472a] transition-colors mt-4"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showOptionalStep1 ? 'rotate-180' : ''}`} />
                {showOptionalStep1 ? 'Hide optional details' : 'Add optional details'}
              </button>

              {showOptionalStep1 && (
              <div className="space-y-4 mt-4 pt-4 border-t border-[#1a472a]/10">

              {/* Interactive Map Pin Location - for globe map placement */}
              <div className="bg-[#f0f7f0] p-4 rounded-lg border border-[#4a7c59]/20">
                <Label className="text-[#1a472a] font-semibold flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[#4a7c59]" />
                  Pin Your Project on the Map
                </Label>
                <p className="text-sm text-[#1a472a]/80 mb-3">
                  Click on the map to place your project pin, or enter coordinates manually below.
                  Your project will appear on our interactive globe map!
                </p>
                
                {/* Place search + Interactive Google Maps Picker */}
                <div className="mb-3">
                  <div className="relative">
                    <input
                      id="place-search-input"
                      type="text"
                      placeholder="Search for a place name (e.g. 'Bali, Indonesia')..."
                      className="w-full px-4 py-2.5 border border-[#4a7c59]/30 rounded-t-lg text-sm bg-white text-[#1a472a] placeholder:text-[#1a472a]/40 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50"
                    />
                    <MapIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a7c59]/50" />
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden border border-[#4a7c59]/30 mb-3">
                  <MapView
                    className="h-[250px] sm:h-[300px] w-full"
                    initialCenter={{
                      lat: formData.latitude || 20,
                      lng: formData.longitude || 0,
                    }}
                    initialZoom={formData.latitude ? 8 : 2}
                    onMapReady={(map) => {
                      // Add a marker for the current position
                      let marker: google.maps.marker.AdvancedMarkerElement | null = null;
                      
                      const placeMarker = (lat: number, lng: number) => {
                        if (marker) marker.map = null;
                        marker = new google.maps.marker.AdvancedMarkerElement({
                          map,
                          position: { lat, lng },
                          title: "Project Location",
                        });
                      };
                      
                      // If we already have coords, place marker
                      if (formData.latitude && formData.longitude) {
                        placeMarker(formData.latitude, formData.longitude);
                      }
                      
                      // Set up Places Autocomplete on the search input
                      const searchInput = document.getElementById("place-search-input") as HTMLInputElement;
                      if (searchInput) {
                        const autocomplete = new google.maps.places.Autocomplete(searchInput, {
                          types: ["geocode", "establishment"],
                          fields: ["geometry", "address_components", "formatted_address", "name"],
                        });
                        autocomplete.bindTo("bounds", map);
                        
                        autocomplete.addListener("place_changed", () => {
                          const place = autocomplete.getPlace();
                          if (place.geometry?.location) {
                            const lat = Math.round(place.geometry.location.lat() * 10000) / 10000;
                            const lng = Math.round(place.geometry.location.lng() * 10000) / 10000;
                            updateField("latitude", lat);
                            updateField("longitude", lng);
                            placeMarker(lat, lng);
                            map.setCenter({ lat, lng });
                            map.setZoom(12);
                            
                            // Extract country and location from address components
                            if (place.address_components) {
                              const countryComp = place.address_components.find(
                                (c) => c.types.includes("country")
                              );
                              const localityComp = place.address_components.find(
                                (c) => c.types.includes("locality")
                              );
                              const adminComp = place.address_components.find(
                                (c) => c.types.includes("administrative_area_level_1")
                              );
                              if (countryComp) {
                                updateField("country", countryComp.long_name);
                              }
                              if (localityComp && countryComp) {
                                updateField("location", `${localityComp.long_name}, ${countryComp.long_name}`);
                              } else if (adminComp && countryComp) {
                                updateField("location", `${adminComp.long_name}, ${countryComp.long_name}`);
                              } else if (place.formatted_address) {
                                updateField("location", place.formatted_address);
                              }
                            }
                          }
                        });
                      }
                      
                      // Click to place marker
                      map.addListener("click", (e: google.maps.MapMouseEvent) => {
                        if (e.latLng) {
                          const lat = Math.round(e.latLng.lat() * 10000) / 10000;
                          const lng = Math.round(e.latLng.lng() * 10000) / 10000;
                          updateField("latitude", lat);
                          updateField("longitude", lng);
                          placeMarker(lat, lng);
                          
                          // Reverse geocode to get country
                          const geocoder = new google.maps.Geocoder();
                          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                            if (status === "OK" && results && results[0]) {
                              const countryComponent = results[0].address_components.find(
                                (c) => c.types.includes("country")
                              );
                              if (countryComponent) {
                                updateField("country", countryComponent.long_name);
                              }
                              const locality = results[0].address_components.find(
                                (c) => c.types.includes("locality")
                              );
                              const adminArea = results[0].address_components.find(
                                (c) => c.types.includes("administrative_area_level_1")
                              );
                              if (locality && countryComponent) {
                                updateField("location", `${locality.long_name}, ${countryComponent.long_name}`);
                              } else if (adminArea && countryComponent) {
                                updateField("location", `${adminArea.long_name}, ${countryComponent.long_name}`);
                              }
                            }
                          });
                        }
                      });
                    }}
                  />
                </div>
                
                {/* Coordinate display + manual entry */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label htmlFor="latitude" className="text-xs text-[#1a472a]">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude ?? ""}
                      onChange={(e) => updateField("latitude", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g. 12.4567"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude" className="text-xs text-[#1a472a]">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude ?? ""}
                      onChange={(e) => updateField("longitude", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g. -85.1234"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <Label htmlFor="country" className="text-xs text-[#1a472a]">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    placeholder="e.g. Costa Rica"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            updateField("latitude", Math.round(pos.coords.latitude * 10000) / 10000);
                            updateField("longitude", Math.round(pos.coords.longitude * 10000) / 10000);
                          },
                          () => alert("Could not get your location. Please enter coordinates manually.")
                        );
                      }
                    }}
                    className="text-sm text-[#336644] hover:text-[#1a472a] underline flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" /> Use my current location
                  </button>
                </div>
                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-[#336644] mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Location pinned at {formData.latitude}, {formData.longitude}
                    {formData.country && ` (${formData.country})`}
                  </p>
                )}
              </div>

              </div>
              )}

              <div>
                <Label htmlFor="vision">Project Vision *</Label>
                <Textarea
                  id="vision"
                  value={formData.vision}
                  onChange={(e) => updateField("vision", e.target.value)}
                  placeholder="Describe your project's vision and purpose..."
                  rows={5}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Land & Team */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Land & Team
              </h2>

              <div>
                <Label htmlFor="landStatus">Land Status *</Label>
                <Select
                  value={formData.landStatus}
                  onValueChange={(value) => updateField("landStatus", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select land status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Owned</SelectItem>
                    <SelectItem value="leased">Leased</SelectItem>
                    <SelectItem value="committed">Committed</SelectItem>
                    <SelectItem value="seeking">Seeking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project Size with Bidirectional Conversion */}
              <div>
                <Label className="text-base font-semibold text-[#1a472a]">Project Size</Label>
                <p className="text-sm text-[#1a472a]/80 mb-2">Enter in either hectares or acres - the other will auto-calculate.</p>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <Label htmlFor="projectSizeHectares" className="text-sm">Hectares</Label>
                    <Input
                      id="projectSizeHectares"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.projectSizeHectares || ""}
                      onChange={(e) => updateField("projectSizeHectares", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g., 50"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectSizeAcres" className="text-sm">Acres</Label>
                    <Input
                      id="projectSizeAcres"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.projectSizeHectares ? (formData.projectSizeHectares * 2.471).toFixed(1) : ""}
                      onChange={(e) => {
                        const acres = e.target.value ? parseFloat(e.target.value) : null;
                        // Convert acres to hectares (1 acre = 0.4047 hectares)
                        updateField("projectSizeHectares", acres ? parseFloat((acres * 0.4047).toFixed(2)) : null);
                      }}
                      placeholder="e.g., 123.5"
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#1a472a]/80 mt-2">
                  1 hectare = 2.471 acres | 1 acre = 0.4047 hectares
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowOptionalStep2(!showOptionalStep2)}
                className="flex items-center gap-2 text-sm text-[#4a7c59] hover:text-[#1a472a] transition-colors mt-4"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showOptionalStep2 ? 'rotate-180' : ''}`} />
                {showOptionalStep2 ? 'Hide optional details' : 'Add optional details'}
              </button>

              {showOptionalStep2 && (
              <div className="space-y-4 mt-4 pt-4 border-t border-[#1a472a]/10">

              {/* Current Community Size */}
              <div className="border border-[#1a472a]/20 rounded-lg p-4 bg-[#f8f5f0]">
                <Label className="text-base font-semibold text-[#1a472a]">Current Community Size</Label>
                <p className="text-sm text-[#1a472a]/80 mb-3">How many people and households currently live on the project?</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentPeopleCount" className="text-sm">People</Label>
                    <Input
                      id="currentPeopleCount"
                      type="number"
                      min="0"
                      value={formData.currentPeopleCount || ""}
                      onChange={(e) => updateField("currentPeopleCount", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="# of people"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentHouseholdCount" className="text-sm">Households</Label>
                    <Input
                      id="currentHouseholdCount"
                      type="number"
                      min="0"
                      value={formData.currentHouseholdCount || ""}
                      onChange={(e) => updateField("currentHouseholdCount", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="# of households"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Intended Full Community Size */}
              <div className="border border-[#1a472a]/20 rounded-lg p-4 bg-[#f8f5f0]">
                <Label className="text-base font-semibold text-[#1a472a]">Intended Full Community Size</Label>
                <p className="text-sm text-[#1a472a]/80 mb-3">What is your target community size at full capacity?</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="intendedPeopleCount" className="text-sm">People</Label>
                    <Input
                      id="intendedPeopleCount"
                      type="number"
                      min="0"
                      value={formData.intendedPeopleCount || ""}
                      onChange={(e) => updateField("intendedPeopleCount", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="# of people"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="intendedHouseholdCount" className="text-sm">Households</Label>
                    <Input
                      id="intendedHouseholdCount"
                      type="number"
                      min="0"
                      value={formData.intendedHouseholdCount || ""}
                      onChange={(e) => updateField("intendedHouseholdCount", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="# of households"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Mixed Use Selection */}
              <div>
                <Label className="text-base">Mixed Use (Select all that apply)</Label>
                <p className="text-sm text-[#1a472a]/80 mb-3">What types of land use does your project include?</p>
                <div className="flex flex-wrap gap-3">
                  {["residential", "commercial", "industrial", "agricultural", "educational", "recreational"].map((use) => (
                    <button
                      key={use}
                      type="button"
                      onClick={() => {
                        const current = formData.mixedUse || [];
                        if (current.includes(use)) {
                          updateField("mixedUse", current.filter(u => u !== use));
                        } else {
                          updateField("mixedUse", [...current, use]);
                        }
                      }}
                      className={`px-4 py-2 rounded-full border-2 transition-all capitalize ${
                        (formData.mixedUse || []).includes(use)
                          ? "border-[#7dd87d] bg-[#7dd87d]/20 text-[#1a472a]"
                          : "border-[#1a472a]/20 bg-white text-[#1a472a] hover:border-[#7dd87d]/50"
                      }`}
                    >
                      {use}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meeting Frequency */}
              <div className="space-y-2">
                <Label htmlFor="meetingFrequency" className="text-base font-semibold text-[#1a472a]">
                  Meeting Frequency
                </Label>
                <p className="text-sm text-[#1a472a]/80">How often does your core community gather in person?</p>
                <Select
                  value={formData.meetingFrequency}
                  onValueChange={(v) => updateField("meetingFrequency", v)}
                >
                  <SelectTrigger id="meetingFrequency">
                    <SelectValue placeholder="Select meeting frequency..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyday">Everyday</SelectItem>
                    <SelectItem value="2_3x_week">2–3× per week</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="2_3x_month">2–3× per month</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="2_3x_year">2–3× per year</SelectItem>
                    <SelectItem value="yearly_plus">Yearly or less</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              </div>
              )}

              <div>
                <Label htmlFor="teamSize">Core Team Size *</Label>
                <Input
                  id="teamSize"
                  type="number"
                  min="1"
                  value={formData.teamSize}
                  onChange={(e) => updateField("teamSize", parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="teamDescription">Team Description *</Label>
                <Textarea
                  id="teamDescription"
                  value={formData.teamDescription}
                  onChange={(e) => updateField("teamDescription", e.target.value)}
                  placeholder="Describe your core team members, their roles, and relevant experience..."
                  rows={5}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 3: Values & Alignment */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Values & Alignment
              </h2>

              <div>
                <Label htmlFor="regenerativePractices">Regenerative Practices *</Label>
                <Textarea
                  id="regenerativePractices"
                  value={formData.regenerativePractices}
                  onChange={(e) => updateField("regenerativePractices", e.target.value)}
                  placeholder="Describe your regenerative practices and ecological restoration approach..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="governanceApproach">Governance Approach *</Label>
                <Textarea
                  id="governanceApproach"
                  value={formData.governanceApproach}
                  onChange={(e) => updateField("governanceApproach", e.target.value)}
                  placeholder="Describe your governance structure and decision-making processes..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="communityEngagement">Community Engagement *</Label>
                <Textarea
                  id="communityEngagement"
                  value={formData.communityEngagement}
                  onChange={(e) => updateField("communityEngagement", e.target.value)}
                  placeholder="How does your project engage with and serve the broader community?..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              {/* Dietary Patterns */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Label className="text-base font-semibold text-[#1a472a]">Dietary Patterns</Label>
                  <div className="group relative cursor-help">
                    <HelpCircle className="w-4 h-4 text-[#1a472a]/40 mt-0.5" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#1a472a] text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                      Dietary alignment matters for community cohesion. Shared meals are central to regenerative living  -  knowing the community's dietary culture helps prospective members assess fit before applying.
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#1a472a]/80">Select all that apply to your community. This helps prospective members find aligned communities.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "vegan", label: "Vegan" },
                    { value: "vegetarian", label: "Vegetarian" },
                    { value: "plant_based", label: "Plant-Based" },
                    { value: "pescatarian", label: "Pescatarian" },
                    { value: "omnivore", label: "Omnivore" },
                    { value: "animal_based", label: "Animal-Based" },
                    { value: "keto", label: "Keto" },
                    { value: "no_shared_diets", label: "No Shared Diets" },
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[#1a472a]/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.dietaryPatterns.includes(value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.dietaryPatterns, value]
                            : formData.dietaryPatterns.filter(v => v !== value);
                          updateField("dietaryPatterns", next);
                        }}
                        className="w-4 h-4 accent-[#4a7c59]"
                      />
                      <span className="text-sm text-[#1a472a]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Commitment & Resources */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Commitment & Resources
              </h2>

              <div>
                <Label htmlFor="timeCommitment">Time Commitment *</Label>
                <Textarea
                  id="timeCommitment"
                  value={formData.timeCommitment}
                  onChange={(e) => updateField("timeCommitment", e.target.value)}
                  placeholder="Describe your team's availability for the season (1 day/week minimum)..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="currentFunding">Current Funding</Label>
                <Textarea
                  id="currentFunding"
                  value={formData.currentFunding}
                  onChange={(e) => updateField("currentFunding", e.target.value)}
                  placeholder="Describe any current funding sources or financial resources..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="fundingNeeds">Funding Needs *</Label>
                <Textarea
                  id="fundingNeeds"
                  value={formData.fundingNeeds}
                  onChange={(e) => updateField("fundingNeeds", e.target.value)}
                  placeholder="What funding or resources do you need to move forward?..."
                  rows={5}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 5: Additional Information */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[#1a472a] mb-4">
                Additional Information
              </h2>

              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => updateField("websiteUrl", e.target.value)}
                  placeholder="https://yourproject.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => updateField("videoUrl", e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="mt-1"
                />
                <p className="text-sm text-[#1a472a]/80 mt-1">
                  Optional: Share a video introducing your project
                </p>
              </div>

              {/* File Upload Section */}
              <FileUpload
                value={formData.documents}
                onChange={(files) => updateField("documents", files)}
                maxFiles={5}
                maxSizeMB={10}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                label="Project Documents"
                helperText="Upload supporting documents (pitch deck, photos, plans, etc.)"
              />

              <div>
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={(e) => updateField("additionalNotes", e.target.value)}
                  placeholder="Anything else you'd like us to know?..."
                  rows={5}
                  className="mt-1"
                />
              </div>

              <div className="bg-[#e8f5e9] border-2 border-[#7dd87d]/50 rounded-lg p-4">
                <p className="text-[#1a472a] font-medium mb-2">
                  Ready to submit?
                </p>
                <p className="text-[#1a472a] text-sm">
                  By submitting this application, you agree to participate in the ReGen Civics next Season and commit to the time requirements outlined in the program.
                </p>
              </div>
            </div>
          )}

          {/* Submit error summary */}
          {submitError && (
            <div className="mt-6 bg-red-900/30 border border-red-500/40 rounded-lg p-3 text-sm text-red-400">
              {submitError}
            </div>
          )}

          {/* Navigation Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
              className="border-[#1a472a]/30 w-full sm:w-auto order-2 sm:order-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={isLoading}
                className="border-[#7dd87d] text-[#336644] w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] w-full sm:w-auto"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#ffd700] to-[#7dd87d] hover:from-[#ffed4e] hover:to-[#6bc86b] text-[#1a472a] w-full sm:w-auto"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <>
                      Submit Application
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
            <DataProtectionBadge compact className="mt-3 justify-center" />
          </div>
        </Card>
      </div>
    </div>
    </PageWrapper>
  );
}
