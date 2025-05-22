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

const BeeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 297 297"
    className="w-full h-full"
    fill="currentColor"
  >
    <path
      d="M262.223,87.121c-21.74-21.739-48.581-34.722-71.809-34.735c-0.373-4.733-1.523-9.251-3.337-13.418
      c0.21-0.178,0.419-0.359,0.617-0.558l16.139-16.139c3.82-3.82,3.82-10.013,0-13.833c-3.821-3.819-10.012-3.819-13.833,0
      l-14.795,14.795c-7.268-5.989-16.574-9.59-26.705-9.59c-10.131,0-19.436,3.601-26.705,9.59L107,8.439
      c-3.821-3.819-10.012-3.819-13.833,0c-3.82,3.82-3.82,10.013,0,13.833l16.139,16.139c0.198,0.198,0.407,0.38,0.617,0.558
      c-1.815,4.167-2.964,8.685-3.337,13.418c-23.228,0.013-50.069,12.996-71.809,34.735c-35.581,35.582-45.379,81.531-22.303,104.607
      c8.133,8.132,19.463,12.431,32.765,12.431c14.327,0,30.03-4.943,45.064-13.827v13.308c0,28.756,20.969,52.692,48.416,57.359v20.645
      c0,5.402,4.379,9.781,9.781,9.781c5.402,0,9.781-4.379,9.781-9.781v-20.645c27.447-4.667,48.416-28.603,48.416-57.359v-13.308
      c15.034,8.884,30.737,13.827,45.064,13.827c0.001,0,0.001,0,0.002,0c13.3,0,24.629-4.298,32.763-12.431
      C307.601,168.652,297.804,122.703,262.223,87.121z M148.5,78.187c-2.054-4.99-5.252-9.506-9.115-13.37
      c-3.799-3.798-8.302-6.748-13.37-8.827c-0.001-0.097-0.011-0.191-0.011-0.288c0-12.405,10.091-22.496,22.496-22.496
      c12.405,0,22.496,10.091,22.496,22.496c0,0.097-0.01,0.192-0.011,0.289c-5.068,2.078-9.571,5.029-13.37,8.827
      C153.752,68.681,150.554,73.197,148.5,78.187 M148.5,119.137c2.248,7.509,5.611,15.18,10.032,22.768
      c-3.225,0.547-6.591,0.848-10.032,0.848c-3.441,0-6.806-0.301-10.032-0.848C142.889,134.318,146.252,126.646,148.5,119.137z
      M26.307,177.895c-14.808-14.809-4.594-50.044,22.303-76.942c17.891-17.891,40.119-29.006,58.01-29.006
      c8.115,0,14.484,2.255,18.932,6.702c14.808,14.809,4.594,50.044-22.303,76.942c-17.891,17.891-40.119,29.005-58.01,29.005
      C37.123,184.597,30.754,182.343,26.307,177.895z M187.135,203.64c0,21.303-17.332,38.635-38.635,38.635
      c-21.303,0-38.635-17.332-38.635-38.635v-3.279c10.207,6.479,23.673,10.37,38.635,10.37c14.962,0,28.428-3.891,38.635-10.37V203.64z
      M148.5,191.17c-16.991,0-32.249-7.167-37.059-16.41c1.912-1.715,3.796-3.491,5.64-5.335c3.31-3.311,6.396-6.711,9.254-10.174
      c6.801,1.975,14.272,3.065,22.164,3.065c7.893,0,15.367-1.086,22.168-3.061c2.857,3.462,5.942,6.861,9.251,10.17
      c1.844,1.844,3.728,3.62,5.64,5.335C180.749,184.002,165.491,191.17,148.5,191.17z M270.693,177.895
      c-4.447,4.447-10.816,6.703-18.931,6.702c-17.892,0-40.12-11.114-58.011-29.005c-26.898-26.898-37.112-62.133-22.303-76.942
      c4.447-4.447,10.816-6.702,18.932-6.702c17.891,0,40.119,11.114,58.01,29.006C275.288,127.852,285.501,163.086,270.693,177.895z"
    />
  </svg>
);

const BUSINESS_TYPES = ["Producer", "Wholesaler", "Processor"];
const AGRICULTURE_TYPES = [
  "Fishery",
  "Poultry",
  "Cattle Rearing",
  "Apiculture",
];

const FirstLoginModal = ({
  isOpen,
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
        "Cattle Rearing": <FontAwesomeIcon icon={faCow} />,
        Apiculture: <BeeIcon />,
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
