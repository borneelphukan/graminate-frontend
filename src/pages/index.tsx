import React, { useState, FormEvent } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import LoginLayout from "@/layout/LoginLayout";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import ForgotPasswordModal from "@/components/modals/ForgotPasswordModal";
import OTPModal from "@/components/modals/OTPModal";
import axios from "axios";
import { API_BASE_URL } from "@/constants/constants";
import InfoModal from "@/components/modals/InfoModal";

const SignIn = () => {
  const router = useRouter();

  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [userEmailForOtp, setUserEmailForOtp] = useState("");
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    text: "",
    variant: "info" as "success" | "error" | "info" | "warning",
  });

  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] =
    useState(false);
  const openForgotPasswordModal = () => {
    setLoginErrorMessage("");
    setIsForgotPasswordModalOpen(true);
  };
  const closeForgotPasswordModal = () => {
    setIsForgotPasswordModalOpen(false);
  };

  const [isLogin, setIsLogin] = useState(true);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [registerData, setRegisterData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    date_of_birth: "",
    password: "",
  });

  const [fieldErrors, setFieldErrors] = useState({
    first_name: false,
    last_name: false,
    email: false,
    phone_number: false,
    date_of_birth: false,
    password: false,
  });

  const [loginErrorMessage, setLoginErrorMessage] = useState("");
  const [emailErrorMessage, setEmailErrorMessage] = useState(
    "This cannot be left blank"
  );
  const [phoneErrorMessage, setPhoneErrorMessage] = useState(
    "This cannot be left blank"
  );
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");

  const toggleForm = () => {
    setIsLogin((prev) => !prev);
  };

  const validatePassword = (password: string): boolean => {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginErrorMessage("");

    if (!loginData.email.trim() || !loginData.password.trim()) {
      setLoginErrorMessage("Email and password are required.");
      return;
    }

    try {
      const response = await axios.post<{
        access_token: string;
        user: { user_id: string };
      }>(`${API_BASE_URL}/user/login`, loginData);
      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      router.push(`/platform/${user.user_id}`);
    } catch (err: unknown) {
      let status: number | undefined;
      let serverMessage: string | undefined = "An unknown error occurred.";

      if (axios.isAxiosError(err)) {
        status = err.response?.status;
        serverMessage =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message;
      } else if (err instanceof Error) {
        serverMessage = err.message;
      }

      if (status === 401 && serverMessage === "User does not exist") {
        setModalState({
          isOpen: true,
          title: "User Not Found",
          text: "Email not registered. Please sign up first.",
          variant: "error",
        });
      } else {
        setModalState({
          isOpen: true,
          title: "Login Failed",
          text: serverMessage || "Invalid email or password.",
          variant: "error",
        });
      }
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFieldErrors({
      first_name: false,
      last_name: false,
      email: false,
      phone_number: false,
      date_of_birth: false,
      password: false,
    });
    setEmailErrorMessage("This cannot be left blank");
    setPhoneErrorMessage("This cannot be left blank");
    setPasswordErrorMessage("");

    let hasError = false;
    const newFieldErrors = { ...fieldErrors };

    if (!registerData.first_name.trim()) {
      newFieldErrors.first_name = true;
      hasError = true;
    }
    if (!registerData.last_name.trim()) {
      newFieldErrors.last_name = true;
      hasError = true;
    }
    if (!validateEmail(registerData.email)) {
      newFieldErrors.email = true;
      setEmailErrorMessage("Enter a valid email ID");
      hasError = true;
    }
    if (!validatePhoneNumber(registerData.phone_number)) {
      newFieldErrors.phone_number = true;
      setPhoneErrorMessage("Enter valid phone number");
      hasError = true;
    }
    if (!registerData.date_of_birth.trim()) {
      newFieldErrors.date_of_birth = true;
      hasError = true;
    }
    if (!validatePassword(registerData.password)) {
      newFieldErrors.password = true;
      setPasswordErrorMessage(
        "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
      );
      hasError = true;
    }

    setFieldErrors(newFieldErrors);
    if (hasError) return;

    setUserEmailForOtp(registerData.email);

    try {
      await axios.post(`${API_BASE_URL}/otp/send-otp`, {
        email: registerData.email,
      });

      setIsOtpModalOpen(true);
    } catch (error: unknown) {
      let errorMessage = "Failed to send OTP. Please try again.";
      if (axios.isAxiosError(error)) {
        errorMessage =
          error.response?.data?.message || error.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Error sending OTP:", error);
      setModalState({
        isOpen: true,
        title: "Error",
        text: errorMessage,
        variant: "error",
      });
    }
  };

  const handleOtpValidation = async (otp: string) => {
    try {
      const verifyResponse = await axios.post<{ success: boolean }>(
        `${API_BASE_URL}/otp/verify-otp`,
        {
          email: userEmailForOtp,
          otp,
        }
      );

      const verifyData = verifyResponse.data;

      if (!verifyData.success) {
        setModalState({
          isOpen: true,
          title: "Invalid OTP",
          text: "The OTP entered is incorrect. Please try again.",
          variant: "error",
        });
        return;
      }

      await axios.post(`${API_BASE_URL}/user/register`, registerData);

      setModalState({
        isOpen: true,
        title: "Registration Successful!",
        text: "You can now log in.",
        variant: "success",
      });

      setIsOtpModalOpen(false);
      toggleForm();
    } catch (error: unknown) {
      let errorMessage = "An error occurred. Please try again later.";
      let status: number | undefined;

      if (axios.isAxiosError(error)) {
        status = error.response?.status;
        errorMessage =
          error.response?.data?.message || error.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (status === 409) {
        setModalState({
          isOpen: true,
          title: "User already exists",
          text: "Please use a different email or phone number.",
          variant: "error",
        });
      } else {
        setModalState({
          isOpen: true,
          title: "Error",
          text: errorMessage,
          variant: "error",
        });
      }
      console.error("Error during OTP validation and registration:", error);
    }
  };
  return (
    <>
      <Head>
        <title>Welcome to Graminate: Manage your Agricultural Budget</title>
      </Head>
      <LoginLayout>
        <div
          className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
          style={{ backgroundImage: "url('/images/cover.png')" }}
        >
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg px-8 py-6 w-full max-w-md">
            {isLogin ? (
              <>
                <h2 className="text-2xl font-semibold mb-6 text-center dark:text-light">
                  Login
                </h2>
                <form onSubmit={handleLogin}>
                  <div className="mb-4">
                    <TextField
                      label="Email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(val) =>
                        setLoginData({ ...loginData, email: val })
                      }
                      width="large"
                    />
                  </div>
                  <div className="mb-6">
                    <TextField
                      label="Password"
                      placeholder="Enter your password"
                      password
                      value={loginData.password}
                      onChange={(val) =>
                        setLoginData({
                          ...loginData,
                          password: val,
                        })
                      }
                      width="large"
                    />
                  </div>
                  {loginErrorMessage && (
                    <p className="text-red-500 text-sm mb-4">
                      {loginErrorMessage}
                    </p>
                  )}
                  <div className="mx-auto flex flex-row justify-center">
                    <Button
                      text="Login"
                      width="large"
                      style="primary"
                      type="submit"
                    />
                  </div>
                  <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-300">
                    <button
                      className="text-blue-200 hover:underline focus:outline-none"
                      type="button"
                      onClick={openForgotPasswordModal}
                    >
                      Forgot Password?
                    </button>
                  </p>
                </form>
                <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-300">
                  Don&apos;t have an account?{" "}
                  <button
                    className="text-blue-200 hover:underline focus:outline-none"
                    type="button"
                    onClick={toggleForm}
                  >
                    Sign Up
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold mb-6 text-center">
                  Sign Up
                </h2>
                <form onSubmit={handleRegister}>
                  <div className="flex flex-row gap-2">
                    <div className="mb-4">
                      <TextField
                        label="First Name"
                        placeholder="Enter your First Name"
                        type={fieldErrors.first_name ? "error" : ""}
                        value={registerData.first_name}
                        onChange={(val) =>
                          setRegisterData({
                            ...registerData,
                            first_name: val,
                          })
                        }
                        width="large"
                      />
                    </div>
                    <div className="mb-4">
                      <TextField
                        label="Last Name"
                        placeholder="Enter your Last Name"
                        type={fieldErrors.last_name ? "error" : ""}
                        value={registerData.last_name}
                        onChange={(val) =>
                          setRegisterData({
                            ...registerData,
                            last_name: val,
                          })
                        }
                        width="large"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <TextField
                      label="Email"
                      placeholder="Enter your Email"
                      type={fieldErrors.email ? "error" : ""}
                      value={registerData.email}
                      onChange={(val) =>
                        setRegisterData({
                          ...registerData,
                          email: val,
                        })
                      }
                      errorMessage={emailErrorMessage}
                      width="large"
                    />
                  </div>
                  <div className="mb-4">
                    <TextField
                      label="Phone Number"
                      placeholder="Enter your Phone Number"
                      type={fieldErrors.phone_number ? "error" : ""}
                      value={registerData.phone_number}
                      onChange={(val) =>
                        setRegisterData({
                          ...registerData,
                          phone_number: val,
                        })
                      }
                      errorMessage={phoneErrorMessage}
                      width="large"
                    />
                  </div>
                  <div className="mb-4">
                    <TextField
                      label="Date of Birth"
                      placeholder="YYYY-MM-DD"
                      type={fieldErrors.date_of_birth ? "error" : ""}
                      value={registerData.date_of_birth}
                      onChange={(val) =>
                        setRegisterData({
                          ...registerData,
                          date_of_birth: val,
                        })
                      }
                      width="large"
                      calendar
                    />
                  </div>
                  <div className="mb-4">
                    <TextField
                      label="Password"
                      placeholder="Enter your password"
                      password
                      type={fieldErrors.password ? "error" : ""}
                      value={registerData.password}
                      onChange={(val) =>
                        setRegisterData({
                          ...registerData,
                          password: val,
                        })
                      }
                      errorMessage={passwordErrorMessage}
                      width="large"
                    />
                  </div>
                  <div className="mx-auto flex flex-row justify-center">
                    <Button
                      text="Sign Up"
                      width="large"
                      style="primary"
                      type="submit"
                    />
                  </div>
                </form>
                <p className="text-center mt-4 text-sm text-dark dark:text-gray-400 ">
                  Already have an account?{" "}
                  <button
                    className="text-blue-500 hover:underline focus:outline-none"
                    type="button"
                    onClick={toggleForm}
                  >
                    Login
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </LoginLayout>

      <InfoModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        text={modalState.text}
        variant={modalState.variant}
      />

      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        closeModal={closeForgotPasswordModal}
      />
      <OTPModal
        isOpen={isOtpModalOpen}
        email={userEmailForOtp}
        onValidate={handleOtpValidation}
        onClose={() => setIsOtpModalOpen(false)}
      />
    </>
  );
};

export default SignIn;
