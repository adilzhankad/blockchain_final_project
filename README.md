### **1. Overview of the Application Architecture**

The application is a decentralized crowdfunding platform operating on a three-tier architecture, ensuring full data immutability and censorship resistance.

* **Smart Contract Layer (Solidity):** Manages campaign creation, fund logic, and ERC-20 reward distribution. Hosted on the **Hardhat Local Network** (EVM).
* **Frontend Layer (Next.js & React):** Provides the user interface for campaign management and real-time data visualization.
* **Web3 Integration (Ethers.js & MetaMask):** Acts as the bridge, injecting the Ethereum provider to sign transactions securely.

**System Architecture Diagram:**

> *User Interface (React) <--> Ethers.js <--> MetaMask Wallet <--> Hardhat Node (Local Blockchain) <--> Smart Contracts (Crowdfunding.sol + RewardToken.sol)*

---

### **2. Design and Implementation Decisions**

**Data Structure Strategy:**
Instead of dynamic arrays, we utilize a mapping for O(1) gas efficiency when retrieving campaign data.

```solidity
struct Campaign {
    address owner;
    string title;
    uint256 target;
    uint256 deadline;
    uint256 amountCollected;
}
mapping(uint256 => Campaign) public campaigns;

```

**Tokenization & Atomicity:**
To ensure reliability, the donation and reward issuance are atomic. If the token minting fails, the ETH transfer is reverted.

* **Decision:** Decoupled `RewardToken` contract for modularity.
* **Implementation:** The main contract calls `token.mint()` strictly within the `donateToCampaign` transaction scope.

**Frontend Precision:**
Since EVM does not support floating-point numbers, the frontend handles conversion before transmission:

* `ethers.parseUnits("1.5", 18)` -> Converts User Input (ETH) to Wei for Blockchain.
* `ethers.formatEther(balance)` -> Converts Wei to ETH for Display.

---

### **3. Smart Contract Logic Description**

The core logic resides in `Crowdfunding.sol`, focusing on three primary operations:

**A. Campaign Initialization (`createCampaign`):**
Validates that the `deadline` is in the future and initializes the `Campaign` struct in storage. Returns the new `campaignId`.

**B. Contribution Logic (`donateToCampaign`):**
This `payable` function handles the financial transfer and reward distribution.

```solidity
function donateToCampaign(uint256 _id) public payable {
    uint256 amount = msg.value;
    Campaign storage campaign = campaigns[_id];

    campaign.donators.push(msg.sender);
    campaign.donations.push(amount);

    // Atomic Reward Distribution (1 ETH = 100 Tokens)
    rewardToken.mint(msg.sender, amount * 100); 

    (bool sent,) = payable(campaign.owner).call{value: amount}("");
    require(sent, "Failed to send Ether");
}

```

**C. Data Retrieval:**
View functions like `getCampaigns()` return arrays of structs, allowing the frontend to fetch all active projects without gas fees.

---

### **4. Frontend-to-Blockchain Interaction**

The application uses `ethers.js` to wrap the `window.ethereum` object injected by MetaMask.

**Connection Flow:**

1. **Provider Instantiation:** `new ethers.BrowserProvider(window.ethereum)` (Read-only access).
2. **Signer Derivation:** `provider.getSigner()` (Write access/Transaction signing).
3. **Contract Binding:**
```javascript
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

```



**Transaction Lifecycle:**

1. User clicks "Fund Campaign".
2. Frontend invokes `contract.donateToCampaign({ value: ethers.parseEther(amount) })`.
3. MetaMask prompts for signature.
4. Frontend awaits `tx.wait()` to confirm block inclusion before updating the UI state.

---

### **5. Deployment and Execution Instructions**

Follow these steps to launch the full DApp environment locally.

**Step 1: Start Local Blockchain**
Initialize the Hardhat node to generate 20 test accounts.

```bash
npx hardhat node

```

**Step 2: Deploy Contracts**
In a new terminal, deploy the contracts to the local network.

```bash
npx hardhat run scripts/deploy.js --network localhost

```

*Output:* `Crowdfunding deployed to: 0x5FbDB...`

**Step 3: Connect Frontend**
Update the contract address in `frontend/app/page.tsx` and start the server.

```javascript
const CONTRACT_ADDRESS = "0x5FbDB..."; // Paste new address here

```

```bash
cd frontend && npm run dev

```

Access the application at: `http://localhost:3000`

---

### **6. Obtaining Test ETH (Localhost)**

Unlike public testnets (Sepolia), the Localhost environment provides immediate liquidity for testing.

* **Source:** The `npx hardhat node` command pre-funds 20 accounts with **10,000 ETH** each.
* **How to Access:**
1. Copy the **Private Key** from the terminal output (e.g., Account #0).
2. Open MetaMask -> **Import Account**.
3. Paste the Private Key.


* **Result:** The wallet balance will instantly update to 10,000 ETH, allowing for unlimited transaction testing without reliance on external faucets.


# Installation and Execution Guide

This document provides a comprehensive guide on how to set up, deploy, and test the Decentralized Crowdfunding Application locally.

## Prerequisites

Ensure the following software is installed on your machine before proceeding:

1. Node.js (Version 16.0 or higher)
2. Git
3. MetaMask Browser Extension

## Step 1: Clone Repository and Install Dependencies

Open your terminal and execute the following commands to download the project and install the necessary software packages.

1. Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>

```

2. Navigate to the project folder:

```bash
cd <PROJECT_FOLDER_NAME>

```

3. Install Hardhat and smart contract dependencies (Root Directory):

```bash
npm install

```

4. Install Frontend dependencies:

```bash
cd frontend
npm install
cd ..

```

*Note: Ensure you return to the root directory after installing frontend dependencies.*

## Step 2: Start the Local Blockchain Node

In the root directory, start the local Ethereum network. This command will start a local node and generate 20 test accounts with 10,000 ETH each.

```bash
npx hardhat node

```

**Important:** Do not close this terminal window. The blockchain must remain running for the application to work.

## Step 3: Deploy the Smart Contract

Open a **second terminal window**. Navigate to the project root directory and deploy the smart contract to the local network:

```bash
npx hardhat run scripts/deploy.js --network localhost

```

Upon successful deployment, the terminal will output the contract address:
`Crowdfunding deployed to: 0x...`

**Action Required:** Copy this address to your clipboard.

## Step 4: Configure the Frontend

You must link the frontend application to the newly deployed smart contract.

1. Open the project in your code editor.
2. Navigate to the file: `frontend/app/page.tsx`.
3. Locate the constant named `CONTRACT_ADDRESS` (usually near line 7).
4. Replace the existing string with the address copied in Step 3.

```javascript
const CONTRACT_ADDRESS = "0x..."; // Paste your new address here

```

5. Save the file.

## Step 5: Launch the Application

In the **second terminal**, navigate to the frontend directory and start the development server:

```bash
cd frontend
npm run dev

```

Open your web browser and visit: http://localhost:3000

## Step 6: Configure MetaMask for Testing

To interact with the application, you must connect MetaMask to your local blockchain and import a funded test account.

### 1. Add Local Network

1. Open MetaMask and click the network selector in the top-left corner.
2. Select "Add network" -> "Add a network manually".
3. Enter the following details:
* **Network Name:** Localhost 8545
* **New RPC URL:** [http://127.0.0.1:8545](https://www.google.com/search?q=http://127.0.0.1:8545)
* **Chain ID:** 31337
* **Currency Symbol:** ETH


4. Click Save and switch to this network.

### 2. Import Test Account

1. Go to the **first terminal** window (where `npx hardhat node` is running).
2. Scroll up to see the list of "Account" and "Private Key".
3. Copy the **Private Key** of Account #0 (or any other account).
4. Open MetaMask, click the account icon (top-right circle), and select **Import Account**.
5. Paste the private key and click Import.
6. Your balance should now display approximately 10,000 ETH.

## Troubleshooting

**Issue: "Nonce too high" or Transaction Errors**
If you restart the blockchain node (`npx hardhat node`), MetaMask might get out of sync because it remembers old transaction history.
**Solution:**

1. Open MetaMask.
2. Go to **Settings** -> **Advanced**.
3. Click **Clear activity tab data**.
4. Refresh the webpage.