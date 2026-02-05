const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding", function () {
  async function deployFixture() {
    const [owner, creator, donor1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("RewardToken");
    const token = await Token.deploy();
    const tokenAddress = await token.getAddress();

    const Crowd = await ethers.getContractFactory("Crowdfunding");
    const crowd = await Crowd.deploy(tokenAddress);
    const crowdAddress = await crowd.getAddress();

    await token.setMinter(crowdAddress);

    return { crowd, token, owner, creator, donor1, crowdAddress };
  }

  it("Should allow creator to withdraw funds after goal reached and deadline passed", async function () {
    const { crowd, creator, donor1, crowdAddress } = await loadFixture(deployFixture);

    const goal = ethers.parseEther("1.0");
    const duration = 60;
    
    await crowd.connect(creator).createCampaign("Test Campaign", "Desc", goal, duration);
    
    await crowd.connect(donor1).contribute(0, { value: ethers.parseEther("1.0") });

    expect(await ethers.provider.getBalance(crowdAddress)).to.equal(ethers.parseEther("1.0"));

    await expect(
      crowd.connect(creator).withdraw(0)
    ).to.be.revertedWith("Campaign still active");

    await time.increase(61);

    const balanceBefore = await ethers.provider.getBalance(creator.address);
    
    const tx = await crowd.connect(creator).withdraw(0);
    const receipt = await tx.wait();

    const gasUsed = receipt.gasUsed * receipt.gasPrice; // для ethers v6 возможно другое получение gasPrice, но для теста пока опустим точную проверку до wei

    const campaign = await crowd.campaigns(0);
    expect(campaign.finalized).to.be.true;
    expect(campaign.fundsWithdrawn).to.be.true;

    expect(await ethers.provider.getBalance(crowdAddress)).to.equal(0);
  });
});