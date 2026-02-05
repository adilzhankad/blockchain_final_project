const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding", function () {
  async function deployFixture() {
    const [owner, creator, donor1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("RewardToken");
    const token = await Token.deploy();
    
    const Crowd = await ethers.getContractFactory("Crowdfunding");
    const crowd = await Crowd.deploy(await token.getAddress());
    
    await token.setMinter(await crowd.getAddress());

    return { crowd, token, owner, creator, donor1, crowdAddress: await crowd.getAddress() };
  }

  it("Should allow creator to withdraw funds after goal reached and deadline passed", async function () {
    const { crowd, creator, donor1, crowdAddress } = await loadFixture(deployFixture);

    await crowd.connect(creator).createCampaign("Success Project", "Desc", ethers.parseEther("1.0"), 60);
    
    await crowd.connect(donor1).contribute(0, { value: ethers.parseEther("1.0") });

    await time.increase(61);

    await expect(crowd.connect(creator).withdraw(0))
      .to.changeEtherBalance(creator, ethers.parseEther("1.0"));
      
    expect(await ethers.provider.getBalance(crowdAddress)).to.equal(0);
  });

  it("Should allow donors to refund if goal NOT reached and deadline passed", async function () {
    const { crowd, creator, donor1, crowdAddress } = await loadFixture(deployFixture);

    await crowd.connect(creator).createCampaign("Failed Project", "Desc", ethers.parseEther("10.0"), 60);
    
    await crowd.connect(donor1).contribute(0, { value: ethers.parseEther("1.0") });

    await expect(crowd.connect(donor1).refund(0)).to.be.revertedWith("Campaign still active");

    await time.increase(61);

    await expect(crowd.connect(donor1).refund(0))
      .to.changeEtherBalance(donor1, ethers.parseEther("1.0"));

    expect(await ethers.provider.getBalance(crowdAddress)).to.equal(0);
  });
});