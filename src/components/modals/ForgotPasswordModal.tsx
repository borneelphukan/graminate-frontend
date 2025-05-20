import React, { useState } from "react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey } from "@fortawesome/free-solid-svg-icons";
import InfoModal from "./InfoModal";
import axiosInstance from "@/lib/utils/axiosInstance";

type Props = {
  isOpen: boolean;
  closeModal: () => void;
};

const ForgotPasswordModal = ({ isOpen, closeModal }: Props) => {
  const [email, setEmail] = useState("");
  const [infoModalState, setInfoModalState] = useState({
    isOpen: false,
    title: "",
    text: "",
    variant: "info" as "success" | "error" | "info" | "warning",
    onClose: () => {},
  });

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setInfoModalState({
        isOpen: true,
        title: "Error",
        text: "Please enter your email address.",
        variant: "error",
        onClose: () => {},
      });
      return;
    }

    try {
      await axiosInstance.post(`/password/forgot`, { email });
      setInfoModalState({
        isOpen: true,
        title: "Email Sent",
        text: "Please check your email for the reset password link.",
        variant: "success",
        onClose: closeModal,
      });
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "Failed to send reset password email.";
      setInfoModalState({
        isOpen: true,
        title: "Error",
        text: message,
        variant: "error",
        onClose: () => {},
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="bg-white dark:bg-dark rounded-lg shadow-lg p-8 w-11/12 max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-500 p-3 rounded-full">
              <FontAwesomeIcon icon={faKey} className="w-8 h-8 text-gray-300" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Forgot password?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No worries, we’ll send you reset instructions.
          </p>

          <form onSubmit={handleResetPassword}>
            <div className="mb-4 text-left">
              <TextField
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChange={setEmail}
                width="large"
              />
            </div>
            <div className="flex flex-col gap-4">
              <Button
                text="Reset Password"
                width="large"
                style="primary"
                type="submit"
              />
              <Button
                text="Back to log in"
                style="ghost"
                onClick={closeModal}
              />
            </div>
          </form>
        </div>
      </div>

      <InfoModal
        isOpen={infoModalState.isOpen}
        onClose={() => {
          setInfoModalState((prev) => ({ ...prev, isOpen: false }));
          infoModalState.onClose();
        }}
        title={infoModalState.title}
        text={infoModalState.text}
        variant={infoModalState.variant}
      />
    </>
  );
};

export default ForgotPasswordModal;
