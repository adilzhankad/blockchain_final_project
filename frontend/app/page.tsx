"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Link from "next/link"; 
import CrowdfundingABI from "../abi/Crowdfunding.json";

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)"
];

export default function Home() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null); // Сохраняем провайдер
  const [loading, setLoading] = useState(false);
  const [totalRaised, setTotalRaised] = useState("0");
  const [campaignCount, setCampaignCount] = useState(0);

  const [userBalance, setUserBalance] = useState({ eth: "0", tokens: "0", symbol: "RWD" });

  const [form, setForm] = useState({ title: "", desc: "", goal: "", duration: "" });

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", (accs: string[]) => {
        setAccount(accs[0]);
        window.location.reload(); 
      });
      connectWallet();
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        const currentAccount = accounts[0];
        setAccount(currentAccount);
        
        const newProvider = new ethers.BrowserProvider((window as any).ethereum);
        setProvider(newProvider);
        
        const signer = await newProvider.getSigner();
        const newContract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI.abi, signer);
        setContract(newContract);
        
        fetchStats(newContract);
        fetchUserBalances(newProvider, newContract, currentAccount);

      } catch (err) {
        console.error("Ошибка подключения:", err);
      }
    }
  };


  const fetchUserBalances = async (prov: any, contr: any, userAddress: string) => {
    try {
      const ethBal = await prov.getBalance(userAddress);
      const ethFormatted = parseFloat(ethers.formatEther(ethBal)).toFixed(4);
      
      setUserBalance(prev => ({ ...prev, eth: ethFormatted }));

      let tokenAddress;
      try {
          tokenAddress = await contr.token(); 
      } catch (e) {
          console.log("Не нашли переменную token, пробуем rewardToken...");
          try {
            tokenAddress = await contr.rewardToken(); 
          } catch (e2) {
            console.error("Не удалось найти адрес токена в контракте");
            return;
          }
      }

      if (tokenAddress) {
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, prov);
          const tokenBal = await tokenContract.balanceOf(userAddress);
          
          setUserBalance(prev => ({
            ...prev,
            tokens: parseFloat(ethers.formatEther(tokenBal)).toFixed(0)
          }));
      }

    } catch (err) {
      console.error("Критическая ошибка загрузки балансов:", err);
    }
  };

  const fetchStats = async (contractInstance: any) => {
    try {
      const count = await contractInstance.nextCampaignId();
      setCampaignCount(Number(count));

      let totalEth = 0;
      for (let i = 0; i < count; i++) {
        const c = await contractInstance.campaigns(i);
        totalEth += parseFloat(ethers.formatEther(c[5]));
      }
      setTotalRaised(totalEth.toFixed(4));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    if (!contract) return alert("Please connect wallet first");
    try {
      setLoading(true);
      const goalWei = ethers.parseEther(form.goal);
      const tx = await contract.createCampaign(form.title, form.desc, goalWei, Number(form.duration));
      await tx.wait();
      alert("Кампания создана!");
      setForm({ title: "", desc: "", goal: "", duration: "" });
      
      fetchStats(contract);
      fetchUserBalances(provider, contract, account);
      
    } catch (err) {
      console.error(err);
      alert("Ошибка создания (проверьте консоль)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      <style jsx global>{`
        body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; }
        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .bg-gradient-mesh { background-color: #0a0a0a; background-image: radial-gradient(at 0% 0%, rgba(6, 87, 249, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.15) 0px, transparent 50%); }
        .neon-glow-primary { box-shadow: 0 0 15px rgba(6, 87, 249, 0.4); }
      `}</style>

      <div className="bg-[#0a0a0a] text-slate-100 min-h-screen bg-gradient-mesh flex flex-col overflow-x-hidden">
        
        {/* HEADER */}
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md px-6 lg:px-20 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#0657f9]">rocket_launch</span>
              <h1 className="text-2xl font-black tracking-tight">CryptoFund</h1>
            </div>
            
            <nav className="hidden md:flex gap-6">
               <Link href="/" className="text-white font-bold border-b-2 border-[#0657f9]">Create</Link>
               <Link href="/campaigns" className="text-slate-400 hover:text-white transition">Active Campaigns</Link>
            </nav>

            <div className="flex items-center gap-4">
              {account && (
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <div className="text-xs text-slate-400 font-medium">My Balance</div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-white">{userBalance.eth} ETH</span>
                    <span className="w-[1px] h-3 bg-white/20"></span>
                    <span className="font-bold text-yellow-400">{userBalance.tokens} {userBalance.symbol}</span>
                  </div>
                </div>
              )}

              <button onClick={connectWallet} className="bg-[#0657f9] hover:bg-[#0657f9]/90 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all neon-glow-primary">
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-20 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Create Form */}
            <div className="glass p-8 rounded-xl relative overflow-hidden">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0657f9]">edit_square</span> Create Campaign
              </h2>
              <div className="space-y-5">
                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#0657f9]/50 transition" placeholder="Campaign Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#0657f9]/50 transition" placeholder="Description..." rows={2} value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#0657f9]/50 transition" placeholder="Goal (ETH)" type="number" value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} />
                  <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#0657f9]/50 transition" placeholder="Duration (Sec)" type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
                </div>
                <button onClick={handleCreate} disabled={loading || !account} className="w-full mt-4 bg-[#0657f9] hover:bg-[#0657f9]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all shadow-xl flex justify-center items-center gap-2">
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span> Processing...
                    </>
                  ) : "Launch Campaign"}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col justify-center lg:pl-12">
              <h3 className="text-slate-400 text-lg font-medium mb-2">Total ETH Raised</h3>
              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-7xl font-black text-white tracking-tighter">{totalRaised}</span>
                <span className="text-3xl font-bold text-[#0657f9] italic">ETH</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="glass p-5 rounded-xl">
                  <p className="text-slate-500 text-xs uppercase font-bold mb-1">Active Projects</p>
                  <p className="text-2xl font-bold">{campaignCount}</p>
                </div>
                <div className="glass p-5 rounded-xl cursor-pointer hover:bg-white/5 transition" onClick={() => window.location.href='/campaigns'}>
                  <p className="text-slate-500 text-xs uppercase font-bold mb-1">View All</p>
                  <p className="text-2xl font-bold text-[#0657f9] flex items-center gap-2">Go to List &rarr;</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}