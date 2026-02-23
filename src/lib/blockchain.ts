// src/lib/blockchain.ts
import { ethers } from "ethers";
import contractAddress from "./contractAddress.json";

// Minimal ABI — only the functions we call from the backend
const ABI = [
  "function createAgreement(address _tenant, string _propertyId, uint256 _monthlyRent, uint256 _startDate, uint256 _endDate, string _ipfsCID) external returns (uint256)",
  "function terminateAgreement(uint256 _id) external",
  "function markExpired(uint256 _id) external",
  "function getAgreement(uint256 _id) external view returns (tuple(uint256 id, address owner, address tenant, string propertyId, uint256 monthlyRent, uint256 startDate, uint256 endDate, string ipfsCID, uint8 status, uint256 createdAt))",
  "function verifyAgreement(uint256 _id, string _ipfsCID) external view returns (bool)",
  "event AgreementCreated(uint256 indexed id, address indexed owner, address indexed tenant, string propertyId, uint256 monthlyRent, string ipfsCID)",
];

function getProvider() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL not set");
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getSigner() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not set");
  return new ethers.Wallet(privateKey, getProvider());
}

export function getContract(withSigner = false) {
  const runner = withSigner ? getSigner() : getProvider();
  return new ethers.Contract(contractAddress.RentalAgreement, ABI, runner);
}

export interface CreateAgreementParams {
  tenantWallet:  string;
  propertyId:    string;
  monthlyRentInr?: number;
  // Backward-compatibility for older callers.
  monthlyRentEth?: number;
  startDate:     Date;
  endDate:       Date;
  ipfsCID:       string;
}

/**
 * Call the smart contract to create an agreement.
 * Returns the on-chain agreement ID and the tx hash.
 */
export async function createOnChainAgreement(
  params: CreateAgreementParams
): Promise<{ onChainId: number; txHash: string }> {
  const contract = getContract(true);

  const rentValue = params.monthlyRentInr ?? params.monthlyRentEth;
  if (rentValue == null) throw new Error("monthlyRentInr is required");
  const rentWei   = ethers.parseEther(rentValue.toString());
  const startUnix = Math.floor(params.startDate.getTime() / 1000);
  const endUnix   = Math.floor(params.endDate.getTime() / 1000);

  const tx = await contract.createAgreement(
    params.tenantWallet,
    params.propertyId,
    rentWei,
    startUnix,
    endUnix,
    params.ipfsCID
  );

  const receipt = await tx.wait();

  // Parse the AgreementCreated event to extract the on-chain ID
  const iface    = new ethers.Interface(ABI);
  let onChainId  = 0;

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "AgreementCreated") {
        onChainId = Number(parsed.args.id);
        break;
      }
    } catch { /* skip non-matching logs */ }
  }

  return { onChainId, txHash: receipt.hash };
}

/**
 * Verify that the IPFS CID on-chain matches the provided one.
 */
export async function verifyAgreementOnChain(
  onChainId: number,
  ipfsCID:   string
): Promise<boolean> {
  const contract = getContract();
  return contract.verifyAgreement(onChainId, ipfsCID);
}
