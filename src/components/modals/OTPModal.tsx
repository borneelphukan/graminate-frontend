import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";

import type { OTPModal } from "@/types/card-props";

const OTPModal = ({ isOpen, email, onValidate, onClose }: OTPModal) => {
  const [otpDigits, setOtpDigits] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (isOpen) {
      inputRefs.current[0]?.focus();
    }
  }, [isOpen]);

  const handleInput = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    const newOtpDigits = [...otpDigits];

    if (value.match(/^[0-9]$/)) {
      newOtpDigits[index] = value;
      setOtpDigits(newOtpDigits);

      // Move focus to the next input field if available
      if (index < inputRefs.current.length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (value === "") {
      newOtpDigits[index] = "";
      setOtpDigits(newOtpDigits);
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleValidateOTP = () => {
    const otp = otpDigits.join("");
    onValidate(otp);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-dark/80">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 w-96">
        <h2 className="text-xl font-semibold mb-4 text-center">Enter OTP</h2>
        <p className="text-center text-gray-600 dark:text-gray-300">
          An OTP has been sent to <strong>{email}</strong>
        </p>

        <div className="flex justify-center space-x-2 my-4">
          {otpDigits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el as HTMLInputElement;
              }}
              type="text"
              className="w-12 h-12 text-center border border-gray-300 rounded text-lg"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
            />
          ))}
        </div>

        <div className="flex justify-center space-x-2">
          <Button text="Cancel" style="secondary" onClick={onClose} />
          <Button text="Validate" style="primary" onClick={handleValidateOTP} />
        </div>
      </div>
    </div>
  );
};

export default OTPModal;
