import Image from "next/image";
import Link from "next/link";

const HomeNavbar = () => {
  return (
    <header className="bg-gray-800 py-2">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:divide-y lg:divide-gray-700 lg:px-8">
        <div className="relative flex h-12 py-1 justify-between items-center">
          {/* Logo Section */}
          <div className="relative z-10 flex px-2 lg:px-0">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/" className="flex flex-row items-center gap-4">
                <Image
                  src={"/images/logo.png"}
                  alt="Graminate Logo"
                  width={40}
                  height={40}
                  className="h-10 w-auto"
                />
                <span className="text-bold text-3xl text-white">Graminate</span>
                <sub className="text-bold text-sm text-white">AgroERP</sub>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HomeNavbar;
