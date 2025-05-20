import Button from "@/components/ui/Button";
import { NextPageContext } from "next";
import Head from "next/head";
import Link from "next/link";
import router from "next/router";

type ErrorProps = {
  statusCode?: number;
  message?: string;
  isTypeError?: boolean;
};

const errorMessages: Record<number, string> = {
  400: "Bad Request – The server could not understand the request.",
  401: "Unauthorized – You must be authenticated to access this resource.",
  403: "Forbidden – You don’t have permission to access this resource.",
  404: "Not Found – The requested page could not be found.",
  405: "Method Not Allowed – This HTTP method is not supported.",
  408: "Request Timeout – The server timed out waiting for the request.",
  429: "Too Many Requests – You’ve sent too many requests in a short time.",
  500: "Internal Server Error – Something went wrong on our end.",
  502: "Bad Gateway – Invalid response from the upstream server.",
  503: "Service Unavailable – Server is temporarily overloaded or down.",
  504: "Gateway Timeout – The upstream server failed to respond in time.",
};

function Error({ statusCode, message, isTypeError }: ErrorProps) {
  const defaultMessage =
    "An unknown error occurred on our end. Please try again later or contact support if the problem persists.";

  const userFriendlyMessage = isTypeError
    ? "A technical issue occurred. Please check your code or contact support."
    : statusCode && errorMessages[statusCode]
    ? errorMessages[statusCode]
    : message || defaultMessage;

  const pageTitle = statusCode ? `Error ${statusCode}` : "An Error Occurred";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>

      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-blue-50 px-4">
        <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-xl sm:p-12">
          {statusCode && (
            <h1 className="mb-3 text-4xl font-extrabold text-red-200 sm:text-7xl">
              {statusCode}
            </h1>
          )}

          <h2 className="mb-4 text-2xl font-bold text-gray-800 sm:text-3xl">
            Oops! Something went wrong.
          </h2>

          <p className="mb-8 text-base text-gray-600 sm:text-lg">
            {userFriendlyMessage}
          </p>

          <Link href="/">
            <Button
              text="Go Back Home"
              style="primary"
              onClick={() => {
                router.back();
              }}
            />
          </Link>
        </div>
      </div>
    </>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  let statusCode = res?.statusCode ?? err?.statusCode;
  let message = err?.message;
  const isTypeError = err instanceof TypeError;

  if (!statusCode) {
    statusCode = err ? 500 : 404;
  }

  if (process.env.NODE_ENV === "production" && statusCode === 500 && message) {
    message = undefined;
  }

  return { statusCode, message, isTypeError };
};

export default Error;
