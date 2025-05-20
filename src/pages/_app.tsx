import "@/styles/globals.css";
import type { AppProps } from "next/app";

import Toast from "@/components/ui/Toast";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";

function App({ Component, pageProps }: AppProps) {
  return (
    <UserPreferencesProvider>
      <Component {...pageProps} />
      <Toast />
    </UserPreferencesProvider>
  );
}
export default App;
