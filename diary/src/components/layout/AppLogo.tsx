import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  to?: string;
  className?: string;
  imgClassName?: string;
};

export default function AppLogo({
  to = "/square",
  className,
  imgClassName,
}: AppLogoProps) {
  return (
    <Link to={to} className={cn("inline-flex items-center", className)}>
      <img
        src="/logo.png"
        alt="CasualDiary logo"
        className={cn(
          "h-10 w-auto object-contain transition-[filter,opacity] dark:brightness-75 dark:opacity-90",
          imgClassName,
        )}
      />
    </Link>
  );
}
