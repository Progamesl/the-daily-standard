import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "$4",
    period: "week",
    annualPrice: "$156",
    description: "Essential access to quality journalism",
    features: [
      "Unlimited article access",
      "Daily newsletter",
      "Mobile app access",
      "Comment on articles",
    ],
  },
  {
    id: "all-access",
    name: "All Access",
    price: "$8",
    period: "week",
    annualPrice: "$312",
    description: "Complete access to everything we offer",
    features: [
      "Everything in Basic",
      "Exclusive subscriber content",
      "Ad-free experience",
      "Archive access (since 1851)",
      "Premium newsletters",
      "Early access to new features",
    ],
    popular: true,
  },
];

export default function SubscribePage() {
  const [billingPeriod, setBillingPeriod] = useState<"weekly" | "annual">("weekly");

  return (
    <Layout>
      <div className="container-newspaper py-12 md:py-16 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Subscribe to The Chronicle
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Support independent journalism and get unlimited access to our award-winning coverage.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-4 bg-muted p-1 rounded-sm">
              <button
                onClick={() => setBillingPeriod("weekly")}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  billingPeriod === "weekly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Weekly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  billingPeriod === "annual"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Annual
                <span className="ml-2 text-xs text-accent">Save 25%</span>
              </button>
            </div>
          </header>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "border border-border p-6 md:p-8 relative",
                  plan.popular && "border-foreground border-2"
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-3 py-1 uppercase tracking-wider">
                    Most Popular
                  </span>
                )}

                <h2 className="font-serif text-2xl font-bold mb-2">{plan.name}</h2>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="font-serif text-4xl font-bold">
                    {billingPeriod === "weekly" ? plan.price : plan.annualPrice}
                  </span>
                  <span className="text-muted-foreground">
                    /{billingPeriod === "weekly" ? plan.period : "year"}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  className="w-full font-semibold"
                >
                  Subscribe Now
                </Button>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h2 className="font-serif text-2xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <div className="rule-thin pt-4">
                <h3 className="font-medium mb-2">Can I cancel anytime?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes, you can cancel your subscription at any time. Your access will continue until
                  the end of your billing period.
                </p>
              </div>

              <div className="rule-thin pt-4">
                <h3 className="font-medium mb-2">Is there a student discount?</h3>
                <p className="text-muted-foreground text-sm">
                  Yes, we offer a 50% discount for students with a valid .edu email address.
                </p>
              </div>

              <div className="rule-thin pt-4">
                <h3 className="font-medium mb-2">Can I share my subscription?</h3>
                <p className="text-muted-foreground text-sm">
                  Each subscription is for individual use. Family plans are available for households
                  that want to share access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
