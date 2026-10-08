import type { MouseEvent } from "react";
export function dismissDialogBackdrop(event: MouseEvent<HTMLDialogElement>, onClose: () => void) {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    event.stopPropagation(); onClose();
  }
}
