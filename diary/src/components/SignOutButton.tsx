import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const nav = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut();
      nav("/login", { replace: true });
    } finally {
      setConfirmOpen(false);
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className="w-full sm:w-auto"
      >
        {loading ? "Signing out..." : "退出登录"}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="退出登录"
        description="确定要退出当前账号吗？"
        confirmText="确认退出"
        loading={loading}
        onConfirm={handleSignOut}
      />
    </>
  );
}
