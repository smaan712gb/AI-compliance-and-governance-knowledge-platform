import { buildMetadata } from "@/lib/seo/metadata";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Globe } from "lucide-react";

export const metadata = buildMetadata({
  title: "Contact AIGovHub - Get in Touch",
  description:
    "Contact AIGovHub for questions about AI governance, compliance consulting, partnerships, or platform support.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Have questions about AI governance, need help with compliance, or
          interested in partnerships? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-12">
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Email</h3>
            <a
              href="mailto:smaan@aimadds.com"
              className="text-sm text-primary hover:underline"
            >
              smaan@aimadds.com
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Phone</h3>
            <a
              href="tel:+15166754832"
              className="text-sm text-primary hover:underline"
            >
              (516) 675-4832
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Globe className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Website</h3>
            <a
              href="https://www.aigovhub.io"
              className="text-sm text-primary hover:underline"
            >
              www.aigovhub.io
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Get in Touch</h2>
          <div className="space-y-4 text-muted-foreground">
            <div>
              <h3 className="font-semibold text-foreground">Saad Muhayyodin Maan</h3>
              <p className="text-sm">CEO, AIGovHub</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">General Inquiries</h3>
              <p className="text-sm">
                For questions about our platform, compliance tools, or vendor
                tracker, email us at{" "}
                <a
                  href="mailto:smaan@aimadds.com"
                  className="text-primary hover:underline"
                >
                  smaan@aimadds.com
                </a>
                .
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Partnerships</h3>
              <p className="text-sm">
                Interested in listing your tool on our vendor tracker, becoming
                an affiliate partner, or exploring enterprise solutions? Reach
                out and we&apos;ll set up a call.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Support</h3>
              <p className="text-sm">
                For technical support with your subscription, compliance tools,
                or account issues, email us and we&apos;ll respond within 24
                hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
