# RentChain – Decentralized Property Rental DApp

> BTech 3rd Year Mini Project | Next.js + Solidity + PostgreSQL + IPFS

---

## 🏗️ Architecture

```
Browser (Next.js)
      │
      ▼
API Layer (Next.js Route Handlers)
      │         │               │
      ▼         ▼               ▼
PostgreSQL    IPFS/Pinata    Ethereum
(Prisma)    (files/docs)   (Solidity SC)
```

---

## 🚀 Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL running locally
- MetaMask wallet (for deploying the contract)
- Pinata account (free tier works) → https://pinata.cloud
- Infura / Alchemy account for Sepolia RPC

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, SEPOLIA_RPC_URL, PRIVATE_KEY,
# PINATA_API_KEY, PINATA_SECRET_KEY
```

### 4. Set up the database
```bash
npm run db:generate   # generate Prisma client
npm run db:push       # push schema to PostgreSQL
```

### 5. Deploy the smart contract

**Local (Hardhat node):**
```bash
npm run chain          # terminal 1: start local node
npm run deploy:local   # terminal 2: deploy
```

**Sepolia testnet:**
```bash
npm run deploy:sepolia
```

Both commands write the contract address to `src/lib/contractAddress.json`.

Also set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env` to the same value.

### 6. Run the dev server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
rental-dapp/
├── contracts/
│   └── RentalAgreement.sol       ← Solidity smart contract
├── scripts/
│   └── deploy.js                 ← Hardhat deploy script
├── prisma/
│   └── schema.prisma             ← Database schema
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Home page
│   │   ├── browse/page.tsx       ← Browse listings
│   │   ├── dashboard/page.tsx    ← Owner/Tenant dashboard
│   │   ├── property/[id]/page.tsx← Property detail + offer form
│   │   └── api/
│   │       ├── auth/register/    ← POST register
│   │       ├── auth/login/       ← POST login
│   │       ├── properties/       ← CRUD properties
│   │       ├── offers/           ← Place / accept / reject offers
│   │       └── agreements/       ← Create & list agreements
│   └── lib/
│       ├── prisma.ts             ← Prisma client singleton
│       ├── jwt.ts                ← JWT sign/verify helpers
│       ├── ipfs.ts               ← Pinata upload helpers
│       └── blockchain.ts         ← ethers.js contract interactions
├── hardhat.config.js
├── .env.example
└── package.json
```

---

## 🔄 Core User Flow

```
Owner registers → creates listing → images uploaded to IPFS
Tenant registers → browses → places offer (price + message)
Owner reviews offers → accepts one
Owner clicks "Finalize" →
    1. Agreement JSON pinned to IPFS (gets CID)
    2. Smart contract called (createAgreement) → tx mined
    3. On-chain ID + tx hash saved to PostgreSQL
Both parties can verify the CID on-chain via verifyAgreement()
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | – | Register (OWNER/TENANT) |
| POST | /api/auth/login | – | Login, returns JWT |
| GET | /api/properties | – | List properties (filterable) |
| POST | /api/properties | OWNER | Create listing (multipart) |
| GET | /api/properties/:id | – | Get single property |
| PUT | /api/properties/:id | OWNER | Update listing |
| DELETE | /api/properties/:id | OWNER | Remove listing |
| GET | /api/offers | AUTH | List offers (role-filtered) |
| POST | /api/offers | TENANT | Place offer |
| PATCH | /api/offers/:id | AUTH | Accept/Reject/Withdraw |
| GET | /api/agreements | AUTH | List agreements |
| POST | /api/agreements | OWNER | Finalize agreement (IPFS + chain) |

---

## 🔐 Smart Contract

**RentalAgreement.sol** — deployed on Ethereum (Sepolia testnet)

Key functions:
- `createAgreement(tenant, propertyId, monthlyRent, startDate, endDate, ipfsCID)` → returns `agreementId`
- `terminateAgreement(id)` — callable by owner or tenant
- `verifyAgreement(id, cid)` → `bool` — tamper check
- `getAgreement(id)` → full struct

---

## 🧪 Testing

```bash
npx hardhat test       # run contract tests
```

---

## 🔮 Future Enhancements (from PRD)

- [ ] On-chain ETH payment via smart contract
- [ ] Rating & review system
- [ ] Mobile app (React Native)
- [ ] Admin analytics dashboard
- [ ] Push notifications for offer updates
