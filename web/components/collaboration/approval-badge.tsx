'use client';

import { useState, useEffect } from 'react';
import {
  useApprovals,
  useCreateApproval,
  useUpdateApprovalStatus,
  type ApprovalDisplay,
} from '@/hooks/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ApprovalBadgeProps {
  projectId: string;
  keyId: string;
  language: string;
  onStatusChange?: () => void;
}

export function ApprovalBadge({ projectId, keyId, language, onStatusChange }: ApprovalBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch approvals for this specific key and language
  const { data: approvals = [] } = useApprovals(projectId, keyId, language);
  const approval = approvals[0]; // Get the first (and should be only) approval

  // Mutations
  const createApprovalMutation = useCreateApproval(projectId);
  const updateApprovalMutation = useUpdateApprovalStatus(projectId);

  const ensureApprovalExists = async (): Promise<string> => {
    if (approval?.id) {
      return approval.id;
    }

    // Create approval if it doesn't exist
    const newApproval = await createApprovalMutation.mutateAsync({
      keyId,
      language,
    });
    return newApproval.id;
  };

  const handleApprove = async () => {
    try {
      const approvalId = await ensureApprovalExists();
      await updateApprovalMutation.mutateAsync({
        approvalId,
        status: 'approved',
      });
      setIsOpen(false);
      onStatusChange?.();
      toast.success('Translation approved');
    } catch (error) {
      toast.error('Failed to approve translation');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    try {
      const approvalId = await ensureApprovalExists();
      await updateApprovalMutation.mutateAsync({
        approvalId,
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      });
      setRejectionReason('');
      setIsOpen(false);
      onStatusChange?.();
      toast.success('Translation rejected');
    } catch (error) {
      toast.error('Failed to reject translation');
    }
  };

  const handleRequestReview = async () => {
    try {
      const approvalId = await ensureApprovalExists();
      await updateApprovalMutation.mutateAsync({
        approvalId,
        status: 'needs_review',
      });
      setIsOpen(false);
      onStatusChange?.();
      toast.success('Review requested');
    } catch (error) {
      toast.error('Failed to request review');
    }
  };

  const loading = createApprovalMutation.isPending || updateApprovalMutation.isPending;

  const getStatusDisplay = () => {
    if (!approval || approval.status === 'pending') {
      return {
        icon: <Clock className="h-3 w-3" />,
        label: 'Pending',
        variant: 'outline' as const,
        color: 'text-muted-foreground',
      };
    }

    switch (approval.status) {
      case 'approved':
        return {
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: 'Approved',
          variant: 'default' as const,
          color: 'text-success',
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-3 w-3" />,
          label: 'Rejected',
          variant: 'destructive' as const,
          color: 'text-destructive',
        };
      case 'needs_review':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Needs Review',
          variant: 'secondary' as const,
          color: 'text-warning',
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          label: 'Pending',
          variant: 'outline' as const,
          color: 'text-muted-foreground',
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center">
          <Badge variant={status.variant} className={cn('text-xs cursor-pointer', status.color)}>
            {status.icon}
            <span className="ml-1">{status.label}</span>
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Approval Status</h4>
            <p className="text-sm text-muted-foreground">
              Review and approve this translation
            </p>
          </div>

          {approval?.status === 'approved' && approval.approvedBy && (
            <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    Approved by {approval.approvedBy.name}
                  </p>
                  {approval.approvedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(approval.approvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {approval?.status === 'rejected' && approval.rejectedBy && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    Rejected by {approval.rejectedBy.name}
                  </p>
                  {approval.rejectionReason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {approval.rejectionReason}
                    </p>
                  )}
                  {approval.rejectedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(approval.rejectedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button
              className="w-full"
              size="sm"
              onClick={handleApprove}
              disabled={approval?.status === 'approved' || loading}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>

            <div className="space-y-2">
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Button
                className="w-full"
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || approval?.status === 'rejected' || loading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>

            <Button
              className="w-full"
              size="sm"
              variant="outline"
              onClick={handleRequestReview}
              disabled={approval?.status === 'needs_review' || loading}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Request Review
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
