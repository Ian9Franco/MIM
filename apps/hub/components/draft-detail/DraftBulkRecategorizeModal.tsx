"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DraftMapLayout, MapParentId } from "@/lib/fomo/draftMapLayout";
import { DraftBulkRecategorizeModalContent } from "./DraftBulkRecategorizeModalContent";
import { useBulkRecategorizeForm } from "./useBulkRecategorizeForm";
import type { ModHit } from "../SpotlightMarquees";

export type DraftBulkRecategorizeModalProps = {
  open: boolean;
  onClose: () => void;
  mods: ModHit[];
  layout: {
    mapLayout: DraftMapLayout;
    usedChildIds: string[];
    onMapLayoutChange: (layout: DraftMapLayout) => void;
  };
  saving: boolean;
  onApply: (branch: MapParentId, categoryId: string) => void;
};

export function DraftBulkRecategorizeModal({
  open,
  onClose,
  mods,
  layout,
  saving,
  onApply,
}: DraftBulkRecategorizeModalProps) {
  const form = useBulkRecategorizeForm(open, mods);
  const { mapLayout, usedChildIds, onMapLayoutChange } = layout;

  return (
    <AnimatePresence>
      {open && mods.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />
          <DraftBulkRecategorizeModalContent
            mods={mods}
            fixedForAll={form.fixedForAll}
            branch={form.branch}
            onBranch={form.setBranch}
            activeBranch={form.activeBranch}
            mapLayout={mapLayout}
            usedChildIds={usedChildIds}
            categoryId={form.categoryId}
            newCategoryName={form.newCategoryName}
            setNewCategoryName={form.setNewCategoryName}
            onMapLayoutChange={onMapLayoutChange}
            onSelectCategory={form.setCategoryId}
            saving={saving}
            canSave={form.canSave}
            onClose={onClose}
            onApply={() => {
              onApply(form.activeBranch, form.categoryId);
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
