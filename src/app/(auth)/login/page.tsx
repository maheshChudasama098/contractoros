import { Suspense } from "react";
import { LoginView } from "@web/features/auth/AuthViews";

// LoginView reads useSearchParams(), which needs a Suspense boundary for static prerender.
export default function Page() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
