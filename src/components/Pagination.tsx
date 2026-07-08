import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
};

export function Pagination({ page, pageSize, total, onPage }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-2 pt-2 text-sm">
      <span className="text-muted-foreground">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => onPage(page - 1)}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular-nums text-muted-foreground">
          {page + 1} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Próxima"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}