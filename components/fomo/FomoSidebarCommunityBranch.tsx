"use client";

import React, { useCallback } from "react";
import { CommunityPanel } from "./CommunityPanel";

interface FomoSidebarCommunityBranchProps {
  activeProject: unknown;
  onClose: () => void;
  onStatus: (text: string, type?: "success" | "error" | "info") => void;
  onOpenProjectDetails?: (id: string, platform?: string) => void;
}

function FomoSidebarCommunityBranchInner({
  activeProject,
  onClose,
  onStatus,
  onOpenProjectDetails,
}: FomoSidebarCommunityBranchProps) {
  const handleClose = useCallback(() => onClose(), [onClose]);

  return (
    <div id="onboarding-fomo-community" className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <CommunityPanel
          activeProject={activeProject}
          onClose={handleClose}
          onStatus={onStatus}
          onOpenProjectDetails={onOpenProjectDetails}
        />
      </div>
    </div>
  );
}

export const FomoSidebarCommunityBranch = React.memo(FomoSidebarCommunityBranchInner);
