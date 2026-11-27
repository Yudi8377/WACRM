export interface PieSlice {
  label: string;
  key: string;
  value: number;
  percent: number;
  color: string;
}

export interface CommunityFeedbackItem {
  id: string;
  kind: "feedback" | "testimonial";
  tenantEmail: string;
  displayName: string;
  businessName: string;
  editionId: "starter" | "pro" | "enterprise" | "sovereign";
  region: string;
  category: string;
  rating: number;
  usefulness: "very_useful" | "useful" | "needs_work";
  sentiment: "positive" | "neutral" | "constructive";
  headline: string;
  message: string;
  photoDataUrl: string | null;
  actionStatus: "new" | "reviewed" | "planned" | "resolved";
  createdAt: string;
}

export interface PublisherIntelligenceReport {
  generatedAt: string;
  dataSource: "neon_live" | "hybrid_live";
  usage: {
    totalRegisteredUsers: number;
    freeUmkmUsers: number;
    activeTrialUsers: number;
    paidLicensedUsers: number;
    totalSessionsLogged: number;
    totalUsageMinutes: number;
    avgSessionMinutes: number;
    usefulnessScorePct: number;
    topFeatures: Array<{
      featureKey: string;
      label: string;
      hits: number;
      minutes: number;
      sharePct: number;
      color: string;
    }>;
    hourlyActivity: Array<{
      hour: number;
      label: string;
      sessions: number;
      minutes: number;
    }>;
    peakHourLabel: string;
    regionBreakdown: PieSlice[];
    editionBreakdown: PieSlice[];
    platformBreakdown: PieSlice[];
  };
  voiceOfCustomer: {
    totalEntries: number;
    totalTestimonials: number;
    totalComments: number;
    avgRating: number;
    usefulnessBreakdown: PieSlice[];
    sentimentBreakdown: PieSlice[];
    categoryGroups: Array<{
      category: string;
      count: number;
      avgRating: number;
      positiveCount: number;
      constructiveCount: number;
      recommendedAction: string;
    }>;
    strategicDecisions: Array<{
      priority: "HIGH" | "MEDIUM" | "OPPORTUNITY";
      title: string;
      insight: string;
      recommendedMove: string;
    }>;
    testimonials: CommunityFeedbackItem[];
    recentFeedback: CommunityFeedbackItem[];
  };
  economics: {
    totalObservedGmvIdr: number;
    avgOrderValueIdr: number;
    repeatBuyerRatePct: number;
    aiFastResponseLiftPct: number;
    peakCheckoutWindow: string;
    productTrends: Array<{
      category: string;
      demandIndex: number;
      growthPct: number;
      avgPriceIdr: number;
      units: number;
      gmvIdr: number;
      momentum: "Naik Tajam" | "Stabil Kuat" | "Peluang Baru";
    }>;
    channelPreference: PieSlice[];
    paymentPreference: PieSlice[];
    buyerBehaviorInsights: Array<{
      metric: string;
      value: string;
      signal: string;
    }>;
    regionalEconomyIndex: Array<{
      region: string;
      activeMerchants: number;
      gmvSharePct: number;
      topCategory: string;
      growthPct: number;
    }>;
  };
}
