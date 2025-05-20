import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Navbar from "@/components/layout/Navbar/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import axios, { AxiosError } from "axios";
import ChatWindow from "@/layout/ChatWindow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "@/lib/utils/axiosInstance";
import InfoModal from "@/components/modals/InfoModal";

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

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSidebarOpen) {
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
  }, [isSidebarOpen]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isChatOpen &&
        chatRef.current &&
        !chatRef.current.contains(event.target as Node)
      ) {
        setIsChatOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isChatOpen]);

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
      await axiosInstance.get(`/user/${currentUserId}`, {
        timeout: 10000,
      });
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
  }, []);

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

  if (!router.isReady || isLoadingAuth) {
    return null;
  }
  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      {!router.isReady || isLoadingAuth || !isAuthorized ? null : (
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
            <div ref={chatRef}>
              <ChatWindow />
            </div>
          )}
        </div>
      )}
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
};

export default PlatformLayout;
