import assert from "node:assert/strict";
import { canEditDraft, isDraftOwner, isInvitedDraftEditor } from "../../apps/hub/lib/drafts/draftPermissions";

function testOwnerAndInviteGates(): void {
  assert.equal(isDraftOwner("user-1", "user-1"), true);
  assert.equal(isDraftOwner("user-1", "user-2"), false);
  assert.equal(isInvitedDraftEditor("user-2", [{ user_id: "user-2", role: "editor" }]), true);
  assert.equal(isInvitedDraftEditor("user-2", [{ user_id: "user-2", role: "viewer" }]), false);
  assert.equal(canEditDraft({ userId: "user-1", ownerId: "user-1", members: [] }), true);
  assert.equal(canEditDraft({ userId: "user-2", ownerId: "user-1", members: [] }), false);
  assert.equal(
    canEditDraft({
      userId: "user-2",
      ownerId: "user-1",
      members: [{ user_id: "user-2", role: "editor" }],
    }),
    true,
  );
  assert.equal(
    canEditDraft({
      userId: "user-3",
      ownerId: "user-1",
      members: [{ user_id: "user-2", role: "editor" }],
    }),
    false,
  );
}

testOwnerAndInviteGates();
console.log("✔ invite-only draft edit gates passed");
