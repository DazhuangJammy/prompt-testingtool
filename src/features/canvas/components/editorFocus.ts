export function isFocusLeavingContainer(
  currentTarget: HTMLElement,
  relatedTarget: EventTarget | null,
) {
  return !(relatedTarget instanceof Node && currentTarget.contains(relatedTarget))
}

export function isTargetOutsideContainer(
  currentTarget: HTMLElement,
  target: EventTarget | null,
) {
  return !(target instanceof Node && currentTarget.contains(target))
}
