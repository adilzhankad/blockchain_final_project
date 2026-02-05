// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRewardToken {
    function mint(address to, uint256 amount) external;
}

contract Crowdfunding {
    struct Campaign {
        address creator;
        string title;
        string description;
        uint256 goalWei;
        uint256 deadline;
        uint256 totalRaisedWei;
        bool finalized;
        bool fundsWithdrawn; 
    }

    IRewardToken public rewardToken;
    uint256 public nextCampaignId;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    uint256 public constant TOKENS_PER_ETH = 100;

    event CampaignCreated(uint256 indexed id, address indexed creator, string title, uint256 goalWei, uint256 deadline);
    event Contributed(uint256 indexed id, address indexed contributor, uint256 amountWei, uint256 tokensMinted);
    event Finalized(uint256 indexed id);
    event FundsWithdrawn(uint256 indexed id, address creator, uint256 amount); 

    constructor(address rewardTokenAddress) {
        rewardToken = IRewardToken(rewardTokenAddress);
    }

    function createCampaign(
        string calldata title,
        string calldata description,
        uint256 goalWei,
        uint256 durationSeconds
    ) external returns (uint256) {
        require(goalWei > 0, "Goal must be > 0");
        require(durationSeconds > 0, "Duration must be > 0");

        uint256 id = nextCampaignId;
        nextCampaignId++;

        uint256 deadline = block.timestamp + durationSeconds;

        campaigns[id] = Campaign({
            creator: msg.sender,
            title: title,
            description: description,
            goalWei: goalWei,
            deadline: deadline,
            totalRaisedWei: 0,
            finalized: false,
            fundsWithdrawn: false 
        });

        emit CampaignCreated(id, msg.sender, title, goalWei, deadline);
        return id;
    }

    function contribute(uint256 campaignId) external payable {
        Campaign storage c = campaigns[campaignId];
        require(c.creator != address(0), "Campaign not found");
        require(block.timestamp < c.deadline, "Campaign ended");
        require(!c.finalized, "Finalized");
        require(msg.value > 0, "Send ETH");

        contributions[campaignId][msg.sender] += msg.value;
        c.totalRaisedWei += msg.value;

        uint256 tokensToMint = (msg.value * TOKENS_PER_ETH);
        rewardToken.mint(msg.sender, tokensToMint);

        emit Contributed(campaignId, msg.sender, msg.value, tokensToMint);
    }

    function finalize(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];
        require(c.creator != address(0), "Campaign not found");
        require(!c.finalized, "Already finalized");
        require(block.timestamp >= c.deadline, "Too early");

        c.finalized = true;
        emit Finalized(campaignId);
    }

    function isActive(uint256 campaignId) external view returns (bool) {
        Campaign storage c = campaigns[campaignId];
        if (c.creator == address(0)) return false;
        if (c.finalized) return false;
        if (block.timestamp >= c.deadline) return false;
        return true;
    }

    function withdraw(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];
        
        require(msg.sender == c.creator, "Only creator can withdraw");
        require(block.timestamp >= c.deadline, "Campaign still active");
        require(c.totalRaisedWei >= c.goalWei, "Goal not reached");
        require(!c.fundsWithdrawn, "Funds already withdrawn");

        uint256 amount = c.totalRaisedWei;
        c.fundsWithdrawn = true;
        c.finalized = true; 

        (bool success, ) = payable(c.creator).call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(campaignId, c.creator, amount);
    }
}