export function activateDiscoverCard(input: {
  clickDetail: number;
  detailsOpenForThisMod: boolean;
  isSelected: boolean;
  openDetails: () => void;
  toggleSelect?: () => void;
}): void {
  if (input.clickDetail > 1) {
    if (!input.isSelected) input.toggleSelect?.();
    return;
  }
  if (input.detailsOpenForThisMod) {
    input.toggleSelect?.();
    return;
  }
  input.openDetails();
}
