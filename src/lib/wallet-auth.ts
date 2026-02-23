export function buildWalletAuthMessage(address: string, nonce: string): string {
  return [
    "RentChain Wallet Authentication",
    "",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    "",
    "Sign this message to authenticate with RentChain.",
    "Only sign this request if you initiated it.",
  ].join("\n");
}

