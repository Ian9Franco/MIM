export type DraftMemberLike = {
  user_id?: string | null;
  profile_id?: string | null;
  role?: string | null;
};

function sameUserId(left?: string | null, right?: string | null): boolean {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

export function isDraftOwner(userId?: string | null, ownerId?: string | null): boolean {
  return Boolean(userId && ownerId && sameUserId(userId, ownerId));
}

export function isInvitedDraftEditor(
  userId?: string | null,
  members: DraftMemberLike[] = [],
): boolean {
  if (!userId) return false;
  return members.some((member) => {
    const memberId = member.user_id || member.profile_id;
    if (!sameUserId(userId, memberId)) return false;
    const role = String(member.role || "editor").toLowerCase();
    return role === "owner" || role === "editor";
  });
}

/** Public drafts are visible; items/settings edits need owner or invite. */
export function canEditDraft(input: {
  userId?: string | null;
  ownerId?: string | null;
  members?: DraftMemberLike[];
}): boolean {
  return isDraftOwner(input.userId, input.ownerId) || isInvitedDraftEditor(input.userId, input.members);
}
