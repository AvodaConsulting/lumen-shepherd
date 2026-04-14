import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  // Class statuses
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-primary/10 text-primary border-primary/20",
  open: "bg-success/10 text-success border-success/20",
  closed: "bg-warning/10 text-warning border-warning/20",
  archived: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  // Church / member statuses
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-warning/10 text-warning border-warning/20",
  disabled: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-primary/10 text-primary border-primary/20",
  // Enrollment statuses
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  withdrawn: "bg-muted text-muted-foreground border-border",
  completed: "bg-primary/10 text-primary border-primary/20",
};

const statusLabels: Record<string, string> = {
  draft: "草稿",
  published: "已發佈",
  open: "開放報名",
  closed: "已截止",
  archived: "已歸檔",
  cancelled: "已取消",
  active: "啟用",
  inactive: "停用",
  disabled: "禁用",
  pending: "待審",
  approved: "已批准",
  rejected: "已拒絕",
  withdrawn: "已退出",
  completed: "已完成",
};

interface StatusChipProps {
  status: string;
  showChinese?: boolean;
  className?: string;
}

export const StatusChip = ({ status, showChinese = false, className }: StatusChipProps) => (
  <Badge variant="outline" className={cn(statusStyles[status] || "bg-muted text-muted-foreground", className)}>
    {status}
    {showChinese && statusLabels[status] && (
      <span className="ml-1 font-chinese text-[10px]">({statusLabels[status]})</span>
    )}
  </Badge>
);
