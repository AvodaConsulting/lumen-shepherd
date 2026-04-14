import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAuditLog = () => {
  const { user } = useAuth();

  const log = async (action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details as any,
    });
  };

  return { log };
};
