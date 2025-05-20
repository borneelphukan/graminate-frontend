import React from "react";
import HomeNavbar from "@/components/layout/Navbar/HomeNavbar";

type PlatformLayoutProps = {
  children: React.ReactNode;
};

const LoginLayout = ({ children }: PlatformLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen bg-light dark:bg-dark text-dark dark:text-light">
      <HomeNavbar />
      <div className="flex ">
        <div className="flex-1">{children}</div>
      </div>

    </div>
  );
};

export default LoginLayout;
