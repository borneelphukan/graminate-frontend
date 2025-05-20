import React, { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";
import LoginLayout from "@/layout/LoginLayout";

const PricingPage = () => {
  const router = useRouter();
  const { user_id } = router.query;
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleCardClick = (planName: string) => {
    if (planName === "Free") return;
    setSelectedPlan(planName);
    if (user_id) {
      console.log(`Navigating user ${user_id} to checkout for ${planName}`);
    } else {
      console.log(`Navigating to checkout for ${planName}`);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "₹0",
      period: "/month",
      description: "Explore all the basic features of Graminate",
      features: [
        "Limited access to CRM and Task Management tools",
        "Standard voice mode",
        "Real-time data from the web with search",
        "Limited access to GPT-4o and o4-mini",
        "Limited access to file uploads, advanced data analysis, and image generation",
        "Use custom GPTs",
      ],
      buttonText: "Your current plan",
      buttonDisabled: true,
      popular: false,
    },
    {
      name: "Plus",
      price: "₹500",
      period: "/month",
      description: "Level up productivity and creativity with expanded access",
      features: [
        "Everything in Free",
        "Extended CRM usage limit, file uploads, and advanced tools",
        "Full access to domain specific dashboards and tools",
        "Access to Graminate AI",
      ],
      buttonText: "Get Plus",
      buttonDisabled: false,
      popular: true,
    },
    {
      name: "Professional",
      price: "₹700",
      period: "/month",
      description: "Get the best of OpenAI with the highest level of access",
      features: [
        "Everything in Plus",
        "Unlimited access to all reasoning models and GPT-4o",
        "Unlimited access to advanced voice",
        "Extended access to deep research, which conducts multi-step online research for complex tasks",
      ],
      buttonText: "Get Pro",
      buttonDisabled: false,
      popular: false,
    },
  ];

  return (
    <>
      <Head>
        <title>Pricing Plans</title>
      </Head>
      <LoginLayout>
        <div className="bg-gray-500 dark:bg-gray-900 py-12 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-dark dark:text-light text-center mb-8">
              Choose your plan
            </h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-white dark:bg-gray-700 rounded-lg shadow-md flex flex-col cursor-pointer transition-all ${
                    selectedPlan === plan.name
                      ? "ring-2 ring-green-200 transform scale-[1.02]"
                      : "hover:shadow-lg"
                  }`}
                  onClick={() => handleCardClick(plan.name)}
                >
                  <div className="p-6 flex-grow">
                    <h3 className="text-xl font-semibold text-dark dark:text-light mb-2 flex items-center justify-center">
                      {plan.name}
                      {plan.popular && (
                        <span className="ml-2 bg-green-200 text-light text-xs font-medium rounded-full px-2 py-0.5">
                          POPULAR
                        </span>
                      )}
                    </h3>
                    <div className="text-center mb-4">
                      <span className="text-3xl font-semibold text-dark dark:text-light">
                        {plan.price}
                      </span>
                      <span className="text-gray-300">{plan.period}</span>
                    </div>
                    <p className="text-dark dark:text-light text-center mb-4">
                      {plan.description}
                    </p>
                    <ul role="list" className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start">
                          <FontAwesomeIcon
                            icon={faCheck}
                            className="size-3 text-green-200 mt-1 flex-shrink-0"
                          />
                          <span className="ml-3 text-dark dark:text-light">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-6 py-4">
                    <Button
                      text={plan.buttonText}
                      style={
                        plan.buttonDisabled
                          ? "ghost"
                          : selectedPlan === plan.name
                          ? "primary"
                          : "secondary"
                      }
                      isDisabled={plan.buttonDisabled}
                      width="large"
                      onClick={() => {
                        handleCardClick(plan.name);
                      }}
                      type="button"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LoginLayout>
    </>
  );
};

export default PricingPage;
