const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const RentalAgreement = await hre.ethers.getContractFactory("RentalAgreement");
  const contract = await RentalAgreement.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("RentalAgreement deployed to:", address);

  // Write address to a JSON file for the frontend
  const fs = require("fs");
  fs.writeFileSync(
    "./src/lib/contractAddress.json",
    JSON.stringify({ RentalAgreement: address }, null, 2)
  );
  console.log("Contract address saved to src/lib/contractAddress.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
