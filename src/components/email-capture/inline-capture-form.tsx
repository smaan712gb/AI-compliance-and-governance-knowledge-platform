"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InlineCaptureFormProps {
  source?: string;
  tags?: string[];
  title?: string;
  description?: string;
  buttonText?: string;
  className?: string;
}

export function InlineCaptureForm({
  source = "inline",
  tags = [],
  title = "Stay Updated on AI Governance",
  description = "Get the latest compliance insights, tool updates, and regulatory changes delivered to your inbox.",
  buttonText = "Subscribe",
  className = "",
}: InlineCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, tags }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Successfully subscribed!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Failed to subscribe. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className={`rounded-lg border bg-card p-6 text-center ${className}`}>
        <p className="text-lg font-semibold text-green-600">Thanks for subscribing!</p>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border bg-card p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "..." : buttonText}
        </Button>
      </form>
      {status === "error" && (
        <p className="text-sm text-red-500 mt-2">{message}</p>
      )}
    </div>
  );
}
