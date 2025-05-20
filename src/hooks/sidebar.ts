import { useEffect } from "react";
import { API_BASE_URL } from "@/constants/constants";

export const useFetchUserType = (
  userId: string | string[] | undefined,
  setUserType: (type: string) => void,
  setSubTypes: (subTypes: string[]) => void,
  setIsLoading: (val: boolean) => void
) => {
  useEffect(() => {
    const fetchUserType = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/user/${userId}`, {
          credentials: "include",
        });
        const json = await res.json();
        const type = json?.user?.type;
        const sub = json?.user?.sub_type ?? [];

        setSubTypes(Array.isArray(sub) ? sub : []);
        setUserType(type || "Producer");
      } catch (err) {
        console.error("Error fetching user type", err);
        setUserType("Producer");
        setSubTypes([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchUserType();
  }, [userId, setUserType, setSubTypes, setIsLoading]);
};

export const useSidebarClickOutside = (closeSubMenu: () => void) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebarElement = document.querySelector(".sidebar-container");
      if (sidebarElement && !sidebarElement.contains(event.target as Node)) {
        closeSubMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeSubMenu]);
};

export const useSidebarAutoClose = (
  isOpen: boolean,
  closeSubMenu: () => void
) => {
  useEffect(() => {
    if (!isOpen) {
      closeSubMenu();
    }
  }, [isOpen, closeSubMenu]);
};
