import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import PlatformLayout from "@/layout/PlatformLayout";
import Calendar from "@/components/ui/Calendar/Calendar";
import Head from "next/head";
import FirstLoginModal from "@/components/modals/FirstLoginModal";
import axiosInstance from "@/lib/utils/axiosInstance";
import InfoModal from "@/components/modals/InfoModal";
import {
  useUserPreferences,
  TimeFormatOption,
} from "@/contexts/UserPreferencesContext";

type User = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  business_name?: string;
  imageUrl?: string | null;
  language?: string;
  time_format?: string;
  type?: string;
  sub_type?: string[];
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
};

const Dashboard = () => {
  const router = useRouter();
  const userId = router.isReady ? (router.query.user_id as string) : undefined;
  const [userData, setUserData] = useState<User | null>(null);
  const [isUserDataLoading, setIsUserDataLoading] = useState<boolean>(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: "",
    text: "",
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    text: "",
  });
  const [fetchErrorModal, setFetchErrorModal] = useState({
    isOpen: false,
    title: "",
    text: "",
  });

  const { timeFormat, setTimeFormat: setContextTimeFormat } =
    useUserPreferences();

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!router.isReady || !userId) return;

    let isMounted = true;
    setIsUserDataLoading(true);

    const fetchUserData = async () => {
      try {
        const response = await axiosInstance.get(`/user/${userId}`);
        const fetchedUser = response.data?.data?.user as User | undefined;
        if (fetchedUser) {
          setUserData(fetchedUser);
          if (fetchedUser.time_format) {
            setContextTimeFormat(fetchedUser.time_format as TimeFormatOption);
          }
          if (!fetchedUser.business_name || !fetchedUser.type) {
            setIsSetupModalOpen(true);
          }
        } else {
          throw new Error("Invalid response: user not found");
        }
      } catch (error: unknown) {
        if (!isMounted) return;

        let errorTitle = "Error";
        let errorText = "Failed to fetch user data. Please try again later.";

        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            errorTitle = "Access Denied";
            errorText = "Session expired. Please log in again.";
          } else if (error.response?.status === 404) {
            errorTitle = "Not Found";
            errorText = `User not found.`;
          } else if (error.code === "ECONNABORTED") {
            errorText =
              "Request timed out. Please check your connection and try again.";
          }
        } else {
          console.error("Non-Axios error fetching user data:", error);
        }

        setFetchErrorModal({
          isOpen: true,
          title: errorTitle,
          text: errorText,
        });
      } finally {
        if (isMounted) {
          setIsUserDataLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [router.isReady, userId, router, setContextTimeFormat]);

  const handleFirstLogin = async (
    businessName: string,
    businessType: string,
    subType?: string[],
    addressLine1?: string,
    addressLine2?: string,
    city?: string,
    state?: string,
    postalCode?: string
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      await axiosInstance.put(`/user/${userId}`, {
        business_name: businessName,
        type: businessType,
        sub_type: subType,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        city: city,
        state: state,
        postal_code: postalCode,
      });

      setSuccessModal({
        isOpen: true,
        title: "Welcome!",
        text: "Your account is now set up. Let’s get started 🚀",
      });

      setUserData((prev) =>
        prev
          ? {
              ...prev,
              business_name: businessName,
              type: businessType,
              sub_type: subType,
              address_line_1: addressLine1,
              address_line_2: addressLine2,
              city: city,
              state: state,
              postal_code: postalCode,
            }
          : prev
      );
    } catch (error: unknown) {
      console.error("Error updating business info:", error);
      setErrorModal({
        isOpen: true,
        title: "Error",
        text: "Failed to update business info. Please try again.",
      });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    if (timeFormat === "12-hour") {
      options.hour12 = true;
    } else {
      options.hour12 = false;
    }
    return date.toLocaleTimeString(undefined, options);
  };

  return (
    <>
      <Head>
        <title>{`Dashboard ${
          userData ? `- ${userData.first_name}` : ""
        } | Graminate Platform`}</title>
      </Head>
      <PlatformLayout>
        <div className="p-4 sm:p-6">
          <header className="mb-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
              <div>
                <h1 className="text-lg font-semibold text-dark dark:text-light">
                  {isUserDataLoading
                    ? "Loading..."
                    : `Hello ${userData?.first_name || "User"},`}
                </h1>
                <p className="text-dark dark:text-light">
                  Welcome to your dashboard.
                </p>
              </div>
              <div className="mt-2 text-sm text-dark dark:text-light sm:text-right">
                <p className="font-semibold">{formatDate(currentDateTime)}</p>
                <p>{formatTime(currentDateTime)}</p>
              </div>
            </div>
          </header>

          <hr className="mb-6 border-gray-400 dark:border-gray-700" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Calendar />
          </div>
        </div>
      </PlatformLayout>

      {isSetupModalOpen && userId && (
        <FirstLoginModal
          isOpen={isSetupModalOpen}
          userId={userId}
          onSubmit={handleFirstLogin}
          onClose={() => setIsSetupModalOpen(false)}
        />
      )}

      <InfoModal
        isOpen={successModal.isOpen}
        onClose={() => {
          setSuccessModal((prev) => ({ ...prev, isOpen: false }));
          window.location.reload();
        }}
        title={successModal.title}
        text={successModal.text}
        variant="success"
      />

      <InfoModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        text={errorModal.text}
        variant="error"
      />

      <InfoModal
        isOpen={fetchErrorModal.isOpen}
        onClose={() => {
          setFetchErrorModal((prev) => ({ ...prev, isOpen: false }));
          router.push("/");
        }}
        title={fetchErrorModal.title}
        text={fetchErrorModal.text}
        variant="error"
      />
    </>
  );
};

export default Dashboard;
