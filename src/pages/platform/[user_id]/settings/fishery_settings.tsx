import React, { useMemo } from "react";
import Head from "next/head";
import PlatformLayout from "@/layout/PlatformLayout";
import SettingsBar from "@/components/layout/SettingsBar";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { getTranslator, translations } from "@/translations";

type TranslationKey = keyof typeof translations.English;

const FisherySettingsPage = () => {
  const { language: currentLanguage } = useUserPreferences();
  const t = useMemo(() => getTranslator(currentLanguage), [currentLanguage]);

  return (
    <>
      <Head>
        <title>{t("fisherySettings" as TranslationKey)}</title>
      </Head>
      <PlatformLayout>
        <div className="flex min-h-screen">
          <SettingsBar />
          <main className="flex-1 px-4 sm:px-6 md:px-12">
            <div className="py-6">
              <div className="pb-4 font-bold text-lg text-dark dark:text-light">
                {t("fisherySettings" as TranslationKey)}
              </div>
              <section className="py-6">
                <div className="rounded-lg p-4">
                  <p className="dark:text-light">
                    Fishery specific settings UI will go here.
                  </p>
                  {/* Add form elements and save button */}
                </div>
              </section>
            </div>
          </main>
        </div>
      </PlatformLayout>
    </>
  );
};
export default FisherySettingsPage;
