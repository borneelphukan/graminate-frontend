import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Navbar from "@/components/layout/Navbar/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import axios, { AxiosError } from "axios";
import ChatWindow from "@/layout/ChatWindow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "@/lib/utils/axiosInstance";
import InfoModal from "@/components/modals/InfoModal";
import CookieDisclaimer from "@/components/ui/CookieDisclaimer";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import FirstLoginModal from "@/components/modals/FirstLoginModal";

type Props = {
  children: React.ReactNode;
};

const PlatformLayout = ({ children }: Props) => {
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    text: "",
    variant: "error" as "success" | "error" | "info" | "warning",
  });

  const router = useRouter();
  const { user_id } = router.query;

  const { isFirstLogin, fetchUserSubTypes } = useUserPreferences();

  useEffect(() => {
    if (isSidebarOpen || isChatOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isSidebarOpen, isChatOpen]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (user_id) {
      setUserId(user_id as string);
    } else {
      setUserId("");
    }
  }, [user_id]);

  const verifySession = useCallback(async (currentUserId: string) => {
    setIsLoadingAuth(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthorized(false);
      setModalState({
        isOpen: true,
        title: "Unauthorized",
        text: "Please log in first.",
        variant: "error",
      });
      return;
    }

    try {
      await fetchUserSubTypes(currentUserId);
        setIsAuthorized(true);
      } catch (error: unknown) {
        setIsAuthorized(false);
        let errorText = "Session expired or unauthorized access.";
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (axiosError.response?.status === 401) {
            errorText = "Session expired. Please log in again.";
          } else if (axiosError.response?.status === 404) {
            errorText = `User not found`;
          }
        }
        setModalState({
          isOpen: true,
          title: "Access Denied",
          text: errorText,
          variant: "error",
        });
      } finally {
        setIsLoadingAuth(false);
      }
    },
    [fetchUserSubTypes]);

  useEffect(() => {
    const accountJustDeleted = sessionStorage.getItem("accountJustDeleted");
    if (accountJustDeleted === "true") {
      sessionStorage.removeItem("accountJustDeleted");
      setIsLoadingAuth(false);
      setIsAuthorized(false);
      return;
    }
    if (!router.isReady) {
      setIsLoadingAuth(true);
      return;
    }
    if (!user_id) {
      setIsLoadingAuth(false);
      setIsAuthorized(false);
      return;
    }
    setIsAuthorized(false);
    verifySession(user_id as string).catch(console.error);
  }, [router.isReady, user_id, verifySession]);

  const handleFirstLoginSubmit = useCallback(
    async (
      businessName: string,
      businessType: string,
      subTypes?: string[],
      addressLine1?: string,
      addressLine2?: string,
      city?: string,
      state?: string,
      postalCode?: string
    ) => {
      try {
        await axiosInstance.put(`/user/${userId}/first-login-setup`, {
          business_name: businessName,
          business_type: businessType,
          sub_type: subTypes,
          address_line_1: addressLine1,
          address_line_2: addressLine2,
          city,
          state,
          postal_code: postalCode,
        });

        await fetchUserSubTypes(userId);

        setModalState({
          isOpen: true,
          title: "Setup Complete!",
          text: "Welcome aboard! Your profile is now ready.",
          variant: "success",
        });
      } catch (error) {
        console.error("Failed to save first login details:", error);
        setModalState({
          isOpen: true,
          title: "Setup Failed",
          text: "We couldn't save your details. Please try again.",
          variant: "error",
        });
        throw error;
      }
    },
    [userId, fetchUserSubTypes]
  );

  if (!router.isReady || isLoadingAuth) {
    return null;
  }
  if (!isAuthorized) {
    return (
      <>
        <InfoModal
          isOpen={modalState.isOpen}
          onClose={() => {
            setModalState((prev) => ({ ...prev, isOpen: false }));
            router.push("/");
          }}
          title={modalState.title}
          text={modalState.text}
          variant={modalState.variant}
        />
      </>
    );
  }

  return (
    <>
      <FirstLoginModal
        isOpen={isFirstLogin}
        userId={userId}
        onSubmit={handleFirstLoginSubmit}
        onClose={() => {}}
      />

      <div className="flex flex-col min-h-screen bg-light dark:bg-dark text-dark dark:text-light">
        <div className="z-50">
          <Navbar
            userId={userId}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </div>

        <div className="flex flex-1 max-h-screen relative">
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <Sidebar isOpen={isSidebarOpen} userId={userId} />

          <div
            className={`flex-1 p-4 overflow-y-auto ${
              isSidebarOpen ? "overflow-hidden" : ""
            }`}
          >
            {children}
          </div>
        </div>

        <button
          onClick={() => setIsChatOpen((prev) => !prev)}
          className="fixed bottom-4 right-4 bg-green-200 text-white p-4 rounded-full shadow-lg hover:bg-green-100 z-50"
        >
          <FontAwesomeIcon icon={faRobot} />
        </button>

        {isChatOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={() => setIsChatOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ChatWindow userId={userId} />
            </div>
          </div>
        )}
      </div>

      <InfoModal
        isOpen={modalState.isOpen && !isAuthorized}
        onClose={() => {
          setModalState((prev) => ({ ...prev, isOpen: false }));
          if (!isAuthorized) router.push("/");
        }}
        title={modalState.title}
        text={modalState.text}
        variant={modalState.variant}
      />
      <CookieDisclaimer />
    </>
  );
};

export default PlatformLayout;
