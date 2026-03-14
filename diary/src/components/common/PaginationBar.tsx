import { Button } from "@/components/ui/button";

type PaginationBarProps = {
  page: number;
  totalPages: number;
  summary: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export default function PaginationBar({
  page,
  totalPages,
  summary,
  disabled = false,
  onPageChange,
}: PaginationBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t pt-4">
      <div className="text-sm text-muted-foreground">{summary}</div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || disabled}
        >
          上一页
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || disabled}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
