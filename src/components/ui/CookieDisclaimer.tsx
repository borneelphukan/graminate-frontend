import React, { useState, useEffect } from "react";

const CookieDisclaimer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookieConsent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] p-4 bg-gray-500 text-dark dark:bg-gray-800 dark:text-light rounded-lg shadow-lg max-w-sm">
      <p className="text-sm mb-3">
        We use cookies to enhance your browsing experience, serve personalized
        ads or content, and analyze our traffic. By clicking &quot;Accept
        All&quot;, you consent to our use of cookies.
      </p>
      <div className="flex justify-end space-x-2">
        <button
          onClick={handleDecline}
          className="px-3 py-1 text-sm bg-gray-400 hover:bg-gray-300 rounded"
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          className="px-3 py-1 text-sm bg-green-200 hover:bg-green-100 text-light rounded"
        >
          Accept All
        </button>
      </div>
    </div>
  );
};

export default CookieDisclaimer;
