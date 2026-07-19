export function normalizeCheckoutPincode(checkoutInfo, rawValue) {
  const pincode = String(rawValue || '').replace(/\D/g, '').slice(0, 6);

  return {
    ...checkoutInfo,
    pincode,
    district: '',
    state: '',
  };
}
