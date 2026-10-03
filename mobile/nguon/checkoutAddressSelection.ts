/** One-shot, in-memory handoff from the address picker back to checkout. */
let pendingChoice: { token: string; addressId: number } | null = null;

export function setCheckoutAddressChoice(token: string, addressId: number) {
  if (!token || !Number.isSafeInteger(addressId) || addressId <= 0) return;
  pendingChoice = { token, addressId };
}

export function takeCheckoutAddressChoice(token: string): number | null {
  const choice = pendingChoice;
  pendingChoice = null;
  return choice?.token === token ? choice.addressId : null;
}

export function clearCheckoutAddressChoice() {
  pendingChoice = null;
}
