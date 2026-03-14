import { useEffect } from "react";
import { useAuthStore } from "../../store/auth";
import { useThemeStore } from "@/store/theme";

export default function AppBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const init = useAuthStore((s) => s.init);
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    void init();
    initTheme();
  }, [init, initTheme]);

  return <>{children}</>;
}
