const hre = require("hardhat");

async function main() {
  const Token = await hre.ethers.getContractFactory("RewardToken");
  const token = await Token.deploy();
  await token.deployed();
  console.log("Token deployed to:", token.address);

  const Crowd = await hre.ethers.getContractFactory("HumanitarianCrowdfunding");
  const crowd = await Crowd.deploy(token.address);
  await crowd.deployed();
  console.log("Crowdfunding deployed to:", crowd.address);

  const tx = await token.setMinter(crowd.address);
  await tx.wait();
  console.log("Minter set ");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
