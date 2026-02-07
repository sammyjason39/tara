import { Badge } from "@/components/ui/badge";

type ApprovalStatusBadgeProps = {
  status: string;
};

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  const tone =
    status === "APPROVED"
      ? "default"
      : status === "REJECTED"
        ? "destructive"
        : status === "PENDING"
          ? "secondary"
          : "outline";
  return <Badge variant={tone}>{status}</Badge>;
}

export default ApprovalStatusBadge;
