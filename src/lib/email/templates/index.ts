import * as React from "react";
import WelcomeEmail from "./welcome";
import Drip1IntroEmail from "./drip-1-intro";
import Drip2ValueEmail from "./drip-2-value";
import Drip3CaseStudyEmail from "./drip-3-case-study";
import Drip4OfferEmail from "./drip-4-offer";

export interface TemplateProps {
  name?: string;
  email: string;
  siteUrl: string;
}

const templates: Record<
  string,
  (props: TemplateProps) => React.ReactElement
> = {
  welcome: WelcomeEmail,
  "drip-1-intro": Drip1IntroEmail,
  "drip-2-value": Drip2ValueEmail,
  "drip-3-case-study": Drip3CaseStudyEmail,
  "drip-4-offer": Drip4OfferEmail,
};

export function getTemplateComponent(
  templateId: string,
  data: TemplateProps,
): React.ReactElement | null {
  const Template = templates[templateId];
  if (!Template) return null;
  return React.createElement(Template, data);
}
