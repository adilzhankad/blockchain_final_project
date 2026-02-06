"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import CrowdfundingABI from "../abi/Crowdfunding.json";


const CONTRACT_ADDRESS = "";

export default function Home() {
  // --- ЛОГИКА (STATE & FUNCTIONS) ---
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRaised, setTotalRaised] = useState("0");

  const [form, setForm] = useState({ title: "", desc: "", goal: "", duration: "" });
  const [donateAmounts, setDonateAmounts] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // В TypeScript нужно явно сказать, что мы обращаемся к window как к любому объекту
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
    } else {
      console.log("MetaMask не найден");
    }
  };

  const fetchCampaigns = async (contractInstance: any) => {
    try {
      const count = await contractInstance.nextCampaignId();
      const loadedCampaigns = [];
      let totalEth = 0;

      for (let i = 0; i < count; i++) {
        const c = await contractInstance.campaigns(i);
        
        // Маппинг данных из контракта
        const raised = ethers.formatEther(c[5]);
        totalEth += parseFloat(raised);

        loadedCampaigns.push({
          id: i,
          creator: c[0],
          title: c[1],
          description: c[2],
          goal: ethers.formatEther(c[3]),
          deadline: Number(c[4]),
          raised: raised,
          finalized: c[6],
          fundsWithdrawn: c[7], 
        });
      }
      setCampaigns(loadedCampaigns);
      setTotalRaised(totalEth.toFixed(4));
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    }
  };

  const handleCreate = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const goalWei = ethers.parseEther(form.goal);
      const tx = await contract.createCampaign(form.title, form.desc, goalWei, Number(form.duration));
      await tx.wait();
      alert("Кампания создана!");
      setForm({ title: "", desc: "", goal: "", duration: "" });
      fetchCampaigns(contract);
    } catch (err) {
      console.error(err);
      alert("Ошибка создания");
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async (id: number) => {
    if (!contract || !donateAmounts[id]) return;
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

  // --- JSX (DESIGN) ---
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      
      <style jsx global>{`
        body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; }
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .bg-gradient-mesh {
          background-color: #0a0a0a;
          background-image: 
            radial-gradient(at 0% 0%, rgba(6, 87, 249, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.15) 0px, transparent 50%);
        }
        .neon-glow-primary { box-shadow: 0 0 15px rgba(6, 87, 249, 0.4); }
        .neon-glow-purple { box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
      `}</style>

      <div className="bg-[#0a0a0a] text-slate-100 min-h-screen bg-gradient-mesh flex flex-col overflow-x-hidden">
        
        {/* HEADER */}
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md px-6 lg:px-20 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0657f9] to-[#a855f7] text-white shadow-lg">
                <span className="material-symbols-outlined text-2xl">rocket_launch</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                CryptoFund
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {account && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
                  </span>
                  <span className="text-xs font-medium text-slate-300">Localhost</span>
                </div>
              )}
              <button 
                onClick={connectWallet}
                className="flex items-center gap-2 bg-[#0657f9] hover:bg-[#0657f9]/90 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all neon-glow-primary"
              >
                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-20 py-12">
          
          {/* HERO SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
            
            {/* Left: Create Form */}
            <div className="glass p-8 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-8xl">add_circle</span>
              </div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0657f9]">edit_square</span>
                Create Campaign
              </h2>
              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">Campaign Title</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0657f9] focus:border-transparent outline-none transition-all placeholder:text-slate-600" 
                    placeholder="e.g. Decentralized Energy Grid" 
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">Description</label>
                  <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0657f9] focus:border-transparent outline-none transition-all placeholder:text-slate-600" 
                    placeholder="Describe your project..." 
                    rows={2}
                    value={form.desc}
                    onChange={e => setForm({...form, desc: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-400 ml-1">Goal (ETH)</label>
                    <div className="relative">
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0657f9] focus:border-transparent outline-none transition-all placeholder:text-slate-600" 
                        placeholder="10.0" 
                        type="number"
                        value={form.goal}
                        onChange={e => setForm({...form, goal: e.target.value})}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0657f9]">ETH</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-400 ml-1">Duration (Sec)</label>
                    <input 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#0657f9] focus:border-transparent outline-none transition-all placeholder:text-slate-600" 
                      placeholder="60" 
                      type="number"
                      value={form.duration}
                      onChange={e => setForm({...form, duration: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleCreate}
                  disabled={loading || !account}
                  className="w-full mt-4 bg-[#0657f9] hover:bg-[#0657f9]/90 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-xl"
                >
                  {loading ? "Processing..." : "Launch Campaign"}
                </button>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex flex-col justify-center lg:pl-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0657f9]/10 border border-[#0657f9]/20 text-[#0657f9] text-sm font-bold w-fit mb-6">
                <span className="material-symbols-outlined text-sm">analytics</span>
                Network Statistics
              </div>
              <h3 className="text-slate-400 text-lg font-medium mb-2">Total ETH Raised</h3>
              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-7xl font-black text-white tracking-tighter">{totalRaised}</span>
                <span className="text-3xl font-bold text-[#0657f9] italic">ETH</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="glass p-5 rounded-xl">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Active Projects</p>
                  <p className="text-2xl font-bold">{campaigns.length}</p>
                </div>
                <div className="glass p-5 rounded-xl">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Status</p>
                  <p className="text-2xl font-bold text-[#22c55e]">Online</p>
                </div>
              </div>
            </div>
          </div>

          {/* CAMPAIGNS GRID */}
          <section>
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold">Active Campaigns</h2>
            </div>
            
            {campaigns.length === 0 && (
               <div className="text-center text-slate-500 py-10">
                 No campaigns found. Launch the first one!
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {campaigns.map((c) => {
                const status = getStatus(c);
                const progress = Math.min((parseFloat(c.raised) / parseFloat(c.goal)) * 100, 100);
                const bgImage = `https://picsum.photos/seed/${c.id + 5}/600/400`;

                return (
                  <div key={c.id} className="glass group flex flex-col rounded-xl overflow-hidden hover:border-[#0657f9]/40 transition-all duration-300">
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
                                className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-[#a855f7] outline-none" 
                                placeholder="0.1" 
                                type="number"
                                onChange={(e) => setDonateAmounts({...donateAmounts, [c.id]: e.target.value})}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">ETH</span>
                            </div>
                            <button 
                              onClick={() => handleDonate(c.id)}
                              className="bg-[#a855f7] hover:bg-[#a855f7]/90 text-white px-6 py-2 rounded-full text-sm font-bold transition-all neon-glow-purple"
                            >
                              Donate
                            </button>
                          </div>
                        )}

                        {account && c.creator.toLowerCase() === account.toLowerCase() && !c.finalized && (
                           <button onClick={() => handleWithdraw(c.id)} className="w-full py-2 rounded-full border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-xs font-bold">
                             OWNER: WITHDRAW FUNDS
                           </button>
                        )}

                        {!c.finalized && status.text === "Ended" && parseFloat(c.raised) < parseFloat(c.goal) && (
                           <button onClick={() => handleRefund(c.id)} className="w-full py-2 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold">
                             CLAIM REFUND
                           </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </main>
        
        {/* Footer */}
        <footer className="mt-20 border-t border-white/5 py-12 px-6 lg:px-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0657f9]">rocket_launch</span>
              <span className="font-bold text-white/50">© 2026 CryptoFund DApp</span>
            </div>
            <div className="flex gap-8 text-sm text-slate-500 font-medium">
              <a className="hover:text-white transition-colors" href="#">Documentation</a>
              <a className="hover:text-white transition-colors" href="#">GitHub</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}