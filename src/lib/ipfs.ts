// src/lib/ipfs.ts
// Uses Pinata REST API — no Node.js-only modules, works in Next.js edge/server

const PINATA_API_KEY    = process.env.PINATA_API_KEY!;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY!;
const GATEWAY           = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

export function ipfsUrl(cid: string) {
  return `${GATEWAY}/${cid}`;
}

/**
 * Pin a file (Buffer / Blob / File) to IPFS via Pinata.
 * Returns the IPFS CID.
 */
export async function pinFile(
  file: Blob | Buffer,
  filename: string,
  mimeType = "application/octet-stream"
): Promise<string> {
  const formData = new FormData();
  const blob = file instanceof Buffer ? new Blob([file], { type: mimeType }) : file;
  formData.append("file", blob, filename);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: filename })
  );

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key:        PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${err}`);
  }

  const data = await res.json();
  return data.IpfsHash as string;   // the CID
}

/**
 * Pin a JSON object to IPFS.
 * Returns the CID.
 */
export async function pinJSON(obj: unknown, name = "metadata"): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type":        "application/json",
      pinata_api_key:        PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: JSON.stringify({ pinataMetadata: { name }, pinataContent: obj }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata JSON pin failed: ${err}`);
  }

  const data = await res.json();
  return data.IpfsHash as string;
}
