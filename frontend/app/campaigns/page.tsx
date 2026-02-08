"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Link from "next/link";

import CrowdfundingABI from "../../abi/Crowdfunding.json";

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export default function CampaignsPage() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [donateAmounts, setDonateAmounts] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", (accs: string[]) => setAccount(accs[0]));
      connectWallet();
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
        
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const newContract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundingABI.abi, signer);
        setContract(newContract);
        
        fetchCampaigns(newContract);
      } catch (err) {
        console.error("Ошибка подключения:", err);
      }
    }
  };

  const fetchCampaigns = async (contractInstance: any) => {
    try {
      const count = await contractInstance.nextCampaignId();
      const loadedCampaigns = [];

      for (let i = 0; i < count; i++) {
        const c = await contractInstance.campaigns(i);
        loadedCampaigns.push({
          id: i,
          creator: c[0],
          title: c[1],
          description: c[2],
          goal: ethers.formatEther(c[3]),
          deadline: Number(c[4]),
          raised: ethers.formatEther(c[5]),
          finalized: c[6],
        });
      }
      setCampaigns(loadedCampaigns);
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    }
  };

  const handleDonate = async (id: number) => {
    if (!contract || !donateAmounts[id]) return alert("Connect wallet or enter amount");
    try {
      setLoading(true);
      const value = ethers.parseEther(donateAmounts[id]);
      const tx = await contract.contribute(id, { value });
      await tx.wait();
      alert("Донат успешен!");
      fetchCampaigns(contract);
    } catch (err) {
      console.error(err);
      alert("Ошибка доната");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (id: number) => {
    try {
      setLoading(true);
      const tx = await contract.withdraw(id);
      await tx.wait();
      alert("Средства выведены!");
      fetchCampaigns(contract);
    } catch (err) {
      console.error(err);
      alert("Ошибка вывода");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (id: number) => {
    try {
      setLoading(true);
      const tx = await contract.refund(id);
      await tx.wait();
      alert("Средства возвращены!");
    } catch (err) {
      console.error(err);
      alert("Ошибка возврата");
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (c: any) => {
    const now = Math.floor(Date.now() / 1000);
    if (c.finalized) return { text: "Completed", color: "text-slate-500 bg-slate-500/10 border-slate-500/20" };
    if (now >= c.deadline) return { text: "Ended", color: "text-red-400 bg-red-400/10 border-red-400/20" };
    return { text: "Active", color: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20" };
  };

  return (
    <div className="bg-[#0a0a0a] text-slate-100 min-h-screen flex flex-col overflow-x-hidden">
      {/* HEADER (Копия для навигации) */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md px-6 lg:px-20 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#0657f9]">rocket_launch</span>
              <h1 className="text-2xl font-black tracking-tight">CryptoFund</h1>
            </div>
            <nav className="hidden md:flex gap-6">
               <Link href="/" className="text-slate-400 hover:text-white transition">Home</Link>
               <Link href="/campaigns" className="text-white font-bold border-b-2 border-[#0657f9]">Active Campaigns</Link>
            </nav>
            <button onClick={connectWallet} className="bg-[#0657f9] hover:bg-[#0657f9]/90 text-white px-6 py-2.5 rounded-full font-bold text-sm">
              {account ? `${account.slice(0, 6)}...` : "Connect Wallet"}
            </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-20 py-12">
        <h2 className="text-3xl font-bold mb-10">All Active Campaigns</h2>
        
        {campaigns.length === 0 && (
            <div className="text-center text-slate-500 py-10">No campaigns found.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((c) => {
                const status = getStatus(c);
                const progress = Math.min((parseFloat(c.raised) / parseFloat(c.goal)) * 100, 100);
                const bgImage = `https://picsum.photos/seed/${c.id + 5}/600/400`;

                return (
                  <div key={c.id} className="bg-white/5 border border-white/10 group flex flex-col rounded-xl overflow-hidden hover:border-[#0657f9]/40 transition-all duration-300">
                    <div className="h-48 w-full bg-cover bg-center relative" style={{ backgroundImage: `url('${bgImage}')` }}>
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all"></div>
                    </div>
                    
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold group-hover:text-[#0657f9] transition-colors">{c.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest border ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm line-clamp-2 mb-6 min-h-[40px]">{c.description}</p>
                      
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-white">{Math.round(progress)}% Funded</span>
                          <span className="text-slate-500">{c.raised} / {c.goal} ETH</span>
                        </div>
                        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#0657f9] to-[#22c55e] rounded-full transition-all duration-700" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>

                      {/* Action Area */}
                      <div className="mt-auto flex flex-col gap-3">
                        {status.text === "Active" && (
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <input 
                                className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-[#a855f7] outline-none text-white" 
                                placeholder="0.1" 
                                type="number"
                                onChange={(e) => setDonateAmounts({...donateAmounts, [c.id]: e.target.value})}
                              />
                            </div>
                            <button onClick={() => handleDonate(c.id)} className="bg-[#a855f7] hover:bg-[#a855f7]/90 text-white px-6 py-2 rounded-full text-sm font-bold transition-all">Donate</button>
                          </div>
                        )}

                        {account && c.creator.toLowerCase() === account.toLowerCase() && !c.finalized && (
                           <button onClick={() => handleWithdraw(c.id)} className="w-full py-2 rounded-full border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-xs font-bold">OWNER: WITHDRAW</button>
                        )}
                        {!c.finalized && status.text === "Ended" && parseFloat(c.raised) < parseFloat(c.goal) && (
                           <button onClick={() => handleRefund(c.id)} className="w-full py-2 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold">CLAIM REFUND</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
            })}
        </div>
      </main>
    </div>
  );
}