import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import PlatformLayout from "@/layout/PlatformLayout";
import SettingsBar from "@/components/layout/SettingsBar";
import DeleteAccountModal from "@/components/modals/DeleteAccountModal";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import TextField from "@/components/ui/TextField";
import axiosInstance from "@/lib/utils/axiosInstance";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { getTranslator, translations } from "@/translations";

type ModalType = "confirmDelete" | "password" | "info" | null;
type InfoModalContent = {
  titleKey: keyof typeof translations.English;
  messageKey: keyof typeof translations.English;
  type: "success" | "error";
};

const AccountPage = () => {
  const router = useRouter();
  const { language: currentLanguage } = useUserPreferences();
  const t = useMemo(() => getTranslator(currentLanguage), [currentLanguage]);

  const [userId, setUserId] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [infoModalContent, setInfoModalContent] = useState<InfoModalContent>({
    titleKey: "errorTitle",
    messageKey: "anUnknownErrorOccurred",
    type: "success",
  });

  const [password, setPassword] = useState("");
  const [passwordErrorKey, setPasswordErrorKey] = useState<
    keyof typeof translations.English | null
  >(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (router.isReady && router.query.user_id) {
      setUserId(router.query.user_id as string);
    }
  }, [router.isReady, router.query.user_id]);

  const openModal = (type: ModalType, infoContent?: InfoModalContent) => {
    setPassword("");
    setPasswordErrorKey(null);
    if (type === "info" && infoContent) {
      setInfoModalContent(infoContent);
    }
    setActiveModal(type);
  };

  const closeModal = () => {
    const wasSuccess =
      infoModalContent.type === "success" &&
      infoModalContent.titleKey === "deletedTitle";
    setActiveModal(null);
    setInfoModalContent({
      titleKey: "errorTitle",
      messageKey: "anUnknownErrorOccurred",
      type: "success",
    });

    if (wasSuccess) {
      sessionStorage.setItem("accountJustDeleted", "true");
      router.push("/");
    }
  };

  const handleInitiateDelete = () => {
    if (!userId) return;
    openModal("confirmDelete");
  };

  const handleConfirmDeletion = () => {
    setActiveModal(null);
    setTimeout(() => openModal("password"), 50);
  };

  const handlePasswordVerification = async () => {
    if (!userId || !password) {
      setPasswordErrorKey("passwordRequiredError");
      return;
    }
    setIsVerifying(true);
    setPasswordErrorKey(null);
    try {
      const response = await axiosInstance.post(
        `/user/verify-password/${userId}`,
        {
          password,
        }
      );
      if (response.data.valid) {
        setActiveModal(null);
        await performAccountDeletion();
      } else {
        setPasswordErrorKey("incorrectPasswordError");
      }
    } catch (error) {
      console.error("Password verification failed", error);
      setPasswordErrorKey("verificationFailedError");
    } finally {
      setIsVerifying(false);
    }
  };

  const performAccountDeletion = async () => {
    if (!userId) return;
    setIsDeleting(true);
    try {
      const deleteResponse = await axiosInstance.delete(
        `/user/delete/${userId}`
      );
      if (deleteResponse.status === 200) {
        openModal("info", {
          titleKey: "deletedTitle",
          messageKey: "accountDeletedMessage",
          type: "success",
        });
      } else {
        throw new Error(
          "Deletion request failed with status: " + deleteResponse.status
        );
      }
    } catch (err) {
      console.error("Failed to delete account", err);
      openModal("info", {
        titleKey: "errorTitle",
        messageKey: "accountDeletionError",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalHeaderClose = () => {
    setActiveModal(null);
    setPassword("");
    setPasswordErrorKey(null);
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case "confirmDelete":
        return (
          <DeleteAccountModal
            isOpen={true}
            onClose={handleModalHeaderClose}
            onHeaderClose={handleModalHeaderClose}
            title={t("areYouSureTitle")}
            footerContent={
              <>
                <Button
                  text={t("cancelButton")}
                  style="secondary"
                  onClick={handleModalHeaderClose}
                />
                <Button
                  text={t("deleteButton")}
                  style="primary"
                  onClick={handleConfirmDeletion}
                />
              </>
            }
          >
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("confirmDeleteMessage")}
            </p>
          </DeleteAccountModal>
        );

      case "password":
        return (
          <DeleteAccountModal
            isOpen={true}
            onClose={() => !isVerifying && handleModalHeaderClose()}
            onHeaderClose={handleModalHeaderClose}
            title={t("enterPasswordTitle")}
            footerContent={
              <>
                <Button
                  text={t("cancelButton")}
                  style="secondary"
                  onClick={handleModalHeaderClose}
                  isDisabled={isVerifying}
                />
                <Button
                  text={t("confirmButton")}
                  style="primary"
                  onClick={handlePasswordVerification}
                  isDisabled={isVerifying || !password}
                />
              </>
            }
          >
            <TextField
              label={t("passwordLabel")}
              placeholder={t("enterPasswordPlaceholder")}
              value={password}
              onChange={(val) => {
                setPassword(val);
                setPasswordErrorKey(null);
              }}
              password={true}
              type={passwordErrorKey ? "error" : ""}
              errorMessage={passwordErrorKey ? t(passwordErrorKey) : ""}
              isDisabled={isVerifying}
              width="large"
            />
          </DeleteAccountModal>
        );

      case "info":
        return (
          <DeleteAccountModal
            isOpen={true}
            onClose={closeModal}
            onHeaderClose={closeModal}
            title={t(infoModalContent.titleKey)}
            footerContent={
              <Button
                text={t("okButton")}
                style="primary"
                onClick={closeModal}
              />
            }
          >
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t(infoModalContent.messageKey)}
            </p>
          </DeleteAccountModal>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>{t("settingsAccountTitle")}</title>
      </Head>
      <PlatformLayout>
        <div className="flex min-h-screen">
          <SettingsBar />

          <main className="flex-1 px-6 md:px-12 py-6">
            <section>
              <h1 className="pb-4 font-bold text-xl md:text-2xl text-dark dark:text-light">
                {t("accountSettings")}
              </h1>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-grow">
                    <p className="font-semibold text-dark dark:text-light">
                      {t("deleteAccountSectionTitle")}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {t("deleteAccountDescription")}
                    </p>
                  </div>

                  <button
                    onClick={handleInitiateDelete}
                    disabled={!userId || isDeleting}
                    className="px-4 py-2 text-sm font-medium shadow-sm text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                  >
                    {isDeleting
                      ? t("deletingButton")
                      : t("deleteAccountButton")}
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </PlatformLayout>
      {renderModalContent()}
    </>
  );
};

export default AccountPage;
