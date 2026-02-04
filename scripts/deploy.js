const hre = require("hardhat");

async function main() {
  const Token = await hre.ethers.getContractFactory("RewardToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Token deployed to:", tokenAddress);

  const Crowd = await hre.ethers.getContractFactory("Crowdfunding"); 
  const crowd = await Crowd.deploy(tokenAddress);
  await crowd.waitForDeployment();
  const crowdAddress = await crowd.getAddress();
  console.log("Crowdfunding deployed to:", crowdAddress);

  const tx = await token.setMinter(crowdAddress);
  await tx.wait();
  console.log("Minter set");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
