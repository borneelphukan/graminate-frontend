import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Swal from "sweetalert2";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import HomeNavbar from "@/components/layout/Navbar/HomeNavbar";
import axios from "axios";
import { API_BASE_URL } from "@/constants/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey } from "@fortawesome/free-solid-svg-icons";

const ResetPasswordPage = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email") || "";
    const tokenParam = urlParams.get("token") || "";

    console.log("Extracted Email:", emailParam);
    console.log("Extracted Token:", tokenParam);

    if (!emailParam || !tokenParam) {
      Swal.fire({
        title: "Invalid Link",
        text: "This password reset link is invalid or expired.",
        icon: "error",
        confirmButtonText: "OK",
      });
      router.push("/");
      return;
    }

    setEmail(emailParam);
    setToken(tokenParam);
  }, [router]);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      Swal.fire({
        title: "Error",
        text: "Passwords do not match.",
        icon: "error",
        confirmButtonText: "OK",
      });
      return;
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      Swal.fire({
        title: "Weak Password",
        text: "Password must be at least 8 characters long, contain one uppercase letter, one number, and one special character.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/password/reset`, {
        email,
        token,
        newPassword,
      });

      Swal.fire({
        title: "Success",
        text: "Password successfully reset. You can now log in.",
        icon: "success",
        confirmButtonText: "OK",
      });

      router.push("/");
    } catch (error: unknown) {
      console.error(error);
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Something went wrong. Please try again later.";
      Swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  return (
    <>
      <Head>
        <title>Graminate: Reset Password</title>
      </Head>
      <HomeNavbar />
      <div className="min-h-screen flex items-center justify-center dark:bg-dark bg-light">
        <div className="bg-white shadow-md rounded p-6 w-96">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-500 p-3 rounded-full">
              <FontAwesomeIcon icon={faKey} className="size-8 text-gray-300" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-center">
            Reset Account Password
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            Enter your new password twice to remember it well
          </p>
          <div className="mb-4 text-left">
            <TextField
              label="New Password"
              placeholder="Enter New Password"
              password
              value={newPassword}
              onChange={(val: string) => setNewPassword(val)}
              width="large"
            />
          </div>
          <div className="mb-4 text-left">
            <TextField
              label="Confirm Password"
              placeholder="Confirm New Password"
              password
              value={confirmPassword}
              onChange={(val: string) => setConfirmPassword(val)}
              width="large"
            />
          </div>
          <div className="mt-4">
            <Button
              text="Reset Password"
              width="large"
              style="primary"
              onClick={handleResetPassword}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPasswordPage;
