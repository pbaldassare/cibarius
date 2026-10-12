import PrivacyPage from "@/pages/site/PrivacyPage";
import DeleteAccountPage from "@/pages/site/DeleteAccountPage";

/** Public even in native apps; never include these in SITE_ROUTES. */
export const LEGAL_ROUTES = [
  { path: "/privacy", element: <PrivacyPage /> },
  { path: "/elimina-account", element: <DeleteAccountPage /> },
];