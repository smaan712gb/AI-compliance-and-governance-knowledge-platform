"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Analytics {
  overview: {
    totalUsers: number;
    newUsersThisMonth: number;
    totalRevenue: number;
    revenueThisMonth: number;
    activeSubscriptions: number;
    totalVendors: number;
    totalContent: number;
    totalSubscribers: number;
    affiliateClicks: number;
  };
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <p className="text-muted-foreground">Failed to load analytics.</p>
      </div>
    );
  }

  const stats = [
    { label: "Total Users", value: data.overview.totalUsers },
    { label: "New Users (30d)", value: data.overview.newUsersThisMonth },
    { label: "Total Revenue", value: `$${data.overview.totalRevenue.toFixed(2)}` },
    { label: "Revenue (30d)", value: `$${data.overview.revenueThisMonth.toFixed(2)}` },
    { label: "Active Subscriptions", value: data.overview.activeSubscriptions },
    { label: "Total Vendors", value: data.overview.totalVendors },
    { label: "Published Content", value: data.overview.totalContent },
    { label: "Email Subscribers", value: data.overview.totalSubscribers },
    { label: "Affiliate Clicks (30d)", value: data.overview.affiliateClicks },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
