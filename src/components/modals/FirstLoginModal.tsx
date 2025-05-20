import React, { useState, useCallback, useEffect, JSX } from "react";
import { triggerToast } from "@/stores/toast";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import RadioButton from "../ui/Radio";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCow, faFish, faKiwiBird } from "@fortawesome/free-solid-svg-icons";

type Step = "businessName" | "address" | "businessType" | "subType";

type FirstLoginModalProps = {
  isOpen: boolean;
  userId: string;
  onSubmit: (
    businessName: string,
    businessType: string,
    subType?: string[],
    addressLine1?: string,
    addressLine2?: string,
    city?: string,
    state?: string,
    postalCode?: string
  ) => Promise<void>;
  onClose: () => void;
};

const BUSINESS_TYPES = ["Producer", "Wholesaler", "Processor"];
const AGRICULTURE_TYPES = ["Fishery", "Poultry", "Animal Husbandry"];

const FirstLoginModal = ({
  isOpen,
  userId,
  onSubmit,
}: FirstLoginModalProps) => {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [step, setStep] = useState<Step>("businessName");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [isStepMounted, setIsStepMounted] = useState(false);

  useEffect(() => {
    setIsStepMounted(false);
    const timer = setTimeout(() => {
      setIsStepMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [step]);

  const handleBusinessNameChange = useCallback((value: string) => {
    setBusinessName(value);
  }, []);

  const handleBusinessTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setBusinessType(event.target.value);
    },
    []
  );

  const goToNextStep = useCallback(() => {
    if (!businessName.trim()) {
      triggerToast("Business Name cannot be blank.", "error");
      return;
    }
    setStep("address");
  }, [businessName]);

  const goToPreviousStep = useCallback(() => {
    setStep((prev) => {
      if (prev === "subType") return "businessType";
      if (prev === "businessType") return "address";
      if (prev === "address") return "businessName";
      return prev;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      await onSubmit(
        businessName.trim(),
        businessType,
        selectedSubTypes.length > 0 ? selectedSubTypes : undefined,
        addressLine1.trim(),
        addressLine2.trim(),
        city.trim(),
        state.trim(),
        postalCode.trim()
      );
    } catch (error: unknown) {
      console.error("Failed to save details:", error);
      triggerToast("Failed to save details. Please try again later.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    businessName,
    businessType,
    onSubmit,
    selectedSubTypes,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
  ]);

  const handleBusinessTypeSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (businessType === "Producer") {
        setStep("subType");
      } else {
        handleSubmit();
      }
    },
    [businessType, handleSubmit]
  );

  const handleSubTypeSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleSubmit();
    },
    [handleSubmit]
  );

  const handleAddressSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (
        !addressLine1.trim() ||
        !city.trim() ||
        !state.trim() ||
        !postalCode.trim()
      ) {
        triggerToast("Please fill in all required address fields", "error");
        return;
      }
      setStep("businessType");
    },
    [addressLine1, city, state, postalCode]
  );

  const handleSubTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSelectedSubTypes((prev) => {
        if (prev.includes(value)) {
          return prev.filter((item) => item !== value);
        }
        return [...prev, value];
      });
    },
    []
  );

  if (!isOpen) {
    return null;
  }

  const renderStepContent = () => {
    if (step === "businessName") {
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goToNextStep();
          }}
          noValidate
        >
          <h2
            className={`text-2xl sm:text-3xl font-semibold mb-2 text-center text-foreground
                transition-all transform duration-500 ease-out
                ${
                  isStepMounted
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 -translate-y-4"
                }`}
          >
            Welcome! Let's set up your business.
          </h2>
          <p
            className={`text-sm text-center text-gray-300  mb-8
                        transition-all transform duration-500 ease-out delay-100
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            Step 1 of {businessType === "Producer" ? 4 : 3}
          </p>
          <div
            className={`mb-6
                        transition-all transform duration-500 ease-out delay-200
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            <TextField
              label="What is your Business Name?"
              placeholder="e.g. Graminate Agrosoft Ltd."
              value={businessName}
              onChange={handleBusinessNameChange}
            />
          </div>
          <div
            className={`flex justify-end mt-10 
                        transition-all transform duration-500 ease-out delay-300
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            <Button
              text="Next"
              style="primary"
              type="submit"
              isDisabled={!businessName.trim()}
            />
          </div>
        </form>
      );
    }

    if (step === "address") {
      return (
        <form onSubmit={handleAddressSubmit} noValidate>
          <h2
            className={`text-2xl sm:text-3xl font-semibold mb-2 text-center text-foreground
                        transition-all transform duration-500 ease-out
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            Enter Your Business Address
          </h2>
          <p
            className={`text-sm text-center text-gray-300 mb-6
                        transition-all transform duration-500 ease-out delay-100
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            Step 2 of {businessType === "Producer" ? 4 : 3}
          </p>
          <div
            className={`space-y-4 mb-6
                        transition-all transform duration-500 ease-out delay-200
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            <TextField
              label="Address Line 1*"
              placeholder="Street address, P.O. box, company name"
              value={addressLine1}
              onChange={(value) => setAddressLine1(value)}
            />
            <TextField
              label="Address Line 2"
              placeholder="Apartment, suite, unit, building, floor, etc."
              value={addressLine2}
              onChange={(value) => setAddressLine2(value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="City*"
                placeholder="City"
                value={city}
                onChange={(value) => setCity(value)}
              />
              <TextField
                label="State/Province/Region*"
                placeholder="State"
                value={state}
                onChange={(value) => setState(value)}
              />
            </div>
            <TextField
              label="Postal Code*"
              placeholder="Postal code"
              value={postalCode}
              onChange={(value) => setPostalCode(value)}
            />
          </div>
          <div
            className={`flex justify-between items-center mt-10
                        transition-all transform duration-500 ease-out 
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                        }`}
          >
            <Button
              text="Back"
              style="secondary"
              onClick={goToPreviousStep}
              type="button"
              isDisabled={isLoading}
            />
            <Button
              text="Next"
              style="primary"
              type="submit"
              isDisabled={
                isLoading ||
                !addressLine1.trim() ||
                !city.trim() ||
                !state.trim() ||
                !postalCode.trim()
              }
            />
          </div>
        </form>
      );
    }

    if (step === "businessType") {
      return (
        <form onSubmit={handleBusinessTypeSubmit} noValidate>
          <h2
            className={`text-2xl sm:text-3xl font-semibold mb-2 text-center text-foreground
                        transition-all transform duration-500 ease-out
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            Select Your Business Type
          </h2>
          <p
            className={`text-sm text-center text-gray-300 mb-6
                        transition-all transform duration-500 ease-out delay-100
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            Step 3 of {businessType === "Producer" ? 4 : 3}
          </p>
          <fieldset
            className={`mb-6
                        transition-all transform duration-500 ease-out delay-200
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            <legend className="block text-lg font-medium text-foreground mb-3">
              Choose Business Type
            </legend>
            <p className="text-sm text-red-100 dark:text-red-300 mb-4 p-3 bg-red-400/20 dark:bg-red-200/10 rounded-lg border border-red-200/50 dark:border-red-200/30">
              This choice is permanent for this account. To select a different
              business type, a new account will be required.
            </p>
            <div className="space-y-3 mt-4">
              {BUSINESS_TYPES.map((type, index) => {
                const isDisabled =
                  type === "Wholesaler" || type === "Processor";
                return (
                  <label
                    key={type}
                    className={`relative group flex items-center space-x-3 p-4 border-1 rounded-xl
                                transition-all duration-200 ease-in-out 
                                ${
                                  isDisabled
                                    ? "opacity-60 cursor-not-allowed bg-gray-400/50 dark:bg-gray-300/30 border-gray-400 dark:border-gray-600"
                                    : `cursor-pointer hover:border-green-200 dark:hover:border-green-100
                                       focus-within:ring-1 focus-within:ring-green-200 focus-within:ring-offset-1 focus-within:ring-offset-background
                                       ${
                                         businessType === type
                                           ? "bg-green-400 dark:bg-green-100/20 border-green-200 dark:border-green-100 shadow-lg"
                                           : " border-gray-300 dark:border-gray-400 hover:bg-gray-400/10 dark:hover:bg-gray-500/10"
                                       }`
                                }
                                transition-opacity transform duration-300 ease-out
                                ${
                                  isStepMounted
                                    ? "opacity-100 translate-x-0"
                                    : "opacity-0 translate-x-5"
                                }`}
                    style={{
                      transitionDelay: isStepMounted
                        ? `${index * 75 + 250}ms`
                        : "0ms",
                    }}
                  >
                    <RadioButton
                      id={`business-type-${type}`}
                      name="businessType"
                      label={type}
                      value={type}
                      checked={!isDisabled && businessType === type}
                      onChange={handleBusinessTypeChange}
                      disabled={isDisabled}
                      className={`h-5 w-5 
                                  ${
                                    isDisabled
                                      ? "text-gray-300 dark:text-gray-500 border-gray-300 dark:border-gray-500"
                                      : "text-green-200 focus:ring-green-100 border-gray-300 dark:border-gray-400 focus:ring-2 focus:ring-offset-1 focus:ring-offset-background"
                                  }`}
                    />
                    {isDisabled && (
                      <span
                        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-10
                                   invisible group-hover:visible 
                                   px-3 py-1.5 text-xs font-medium text-light bg-dark rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap dark:bg-gray-300 dark:text-dark"
                      >
                        Available Soon
                        <svg
                          className="absolute text-dark dark:text-gray-300 h-2 w-full left-0 top-full"
                          x="0px"
                          y="0px"
                          viewBox="0 0 255 255"
                          xmlSpace="preserve"
                        >
                          <polygon
                            className="fill-current"
                            points="0,0 127.5,127.5 255,0"
                          />
                        </svg>
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div
            className={`flex justify-between items-center mt-10
                        transition-all transform duration-500 ease-out 
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                        }`}
            style={{
              transitionDelay: isStepMounted
                ? `${BUSINESS_TYPES.length * 75 + 300}ms`
                : "0ms",
            }}
          >
            <Button
              text="Back"
              style="secondary"
              onClick={goToPreviousStep}
              type="button"
              isDisabled={isLoading}
            />
            <Button
              text={
                businessType === "Producer"
                  ? "Next"
                  : isLoading
                  ? "Saving..."
                  : "Get Started"
              }
              style="primary"
              type="submit"
              isDisabled={
                isLoading ||
                businessType === "Wholesaler" ||
                businessType === "Processor"
              }
            />
          </div>
        </form>
      );
    }

    if (step === "subType") {
      const AgricultureIcons: Record<string, JSX.Element> = {
        Fishery: <FontAwesomeIcon icon={faFish} />,
        Poultry: <FontAwesomeIcon icon={faKiwiBird} />,
        "Animal Husbandry": <FontAwesomeIcon icon={faCow} />,
      };
      return (
        <form onSubmit={handleSubTypeSubmit} noValidate>
          <h2
            className={`text-2xl sm:text-3xl font-semibold mb-2 text-center text-foreground
                        transition-all transform duration-500 ease-out
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            Choose Your Type of Agriculture
          </h2>
          <p
            className={`text-sm text-center text-gray-300 mb-8
                        transition-all transform duration-500 ease-out delay-100
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            Step 4 of 4
          </p>
          <fieldset
            className={`mb-6
                        transition-all transform duration-500 ease-out delay-200
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-4"
                        }`}
          >
            <legend className="block text-lg font-medium text-foreground mb-4">
              Select one or more options:
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              {AGRICULTURE_TYPES.map((option, index) => (
                <label
                  key={option}
                  htmlFor={`subtype-${option}`}
                  className={`flex flex-col items-center justify-center text-center p-4 border-1 rounded-xl cursor-pointer 
                              transition-all duration-200 ease-in-out group
                              hover:border-green-200 dark:hover:border-green-100
                             
                              ${
                                selectedSubTypes.includes(option)
                                  ? "bg-green-400 dark:bg-green-100/30 border-green-200 dark:border-green-100 shadow-lg"
                                  : "bg-light dark:bg-gray-700 border-gray-300 dark:border-gray-300 hover:bg-gray-400/10 dark:hover:bg-gray-500/10"
                              }
                              transition-opacity transform duration-300 ease-out
                              ${
                                isStepMounted
                                  ? "opacity-100 translate-x-0"
                                  : "opacity-0 translate-x-5"
                              }`}
                  style={{
                    transitionDelay: isStepMounted
                      ? `${index * 75 + 250}ms`
                      : "0ms",
                  }}
                >
                  <input
                    type="checkbox"
                    id={`subtype-${option}`}
                    name="subType"
                    value={option}
                    checked={selectedSubTypes.includes(option)}
                    onChange={handleSubTypeChange}
                    className="sr-only peer"
                  />
                  <div
                    className={`w-10 h-10 mb-3 flex items-center justify-center text-3xl
                                 transition-colors duration-200 
                                 ${
                                   selectedSubTypes.includes(option)
                                     ? "text-green-100 dark:text-green-300"
                                     : "text-gray-400 dark:text-gray-300 group-hover:text-green-200 dark:group-hover:text-green-200 peer-focus:text-green-200 dark:peer-focus:text-green-200"
                                 }`}
                  >
                    {AgricultureIcons[option]}
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors duration-200 ${
                      selectedSubTypes.includes(option)
                        ? "text-green-100 dark:text-green-300"
                        : "text-dark dark:text-light group-hover:text-green-200 dark:group-hover:text-green-200 peer-focus:text-green-100 dark:peer-focus:text-green-200"
                    }`}
                  >
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div
            className={`flex justify-between items-center mt-10
                        transition-all transform duration-500 ease-out 
                        ${
                          isStepMounted
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                        }`}
            style={{
              transitionDelay: isStepMounted
                ? `${AGRICULTURE_TYPES.length * 75 + 300}ms`
                : "0ms",
            }}
          >
            <Button
              text="Back"
              style="secondary"
              onClick={goToPreviousStep}
              type="button"
              isDisabled={isLoading}
            />
            <Button
              text={isLoading ? "Saving..." : "Get Started"}
              style="primary"
              type="submit"
              isDisabled={isLoading || selectedSubTypes.length === 0}
            />
          </div>
        </form>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-light/70 dark:bg-dark/70 backdrop-blur-md p-4"
      role="dialog"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-lg relative transition-all duration-300 ease-out">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default FirstLoginModal;
