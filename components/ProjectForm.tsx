import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../types';

interface SubProductEntry {
  name: string;
  duration: number;
}

interface ProjectFormProps {
  onAdd: (p: Project) => void;
  availableColors: string[];
  variant?: 'primary' | 'minimal';
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onAdd, availableColors, variant = 'primary' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [demand, setDemand] = useState(5);
  const [deadline, setDeadline] = useState(10);
  const [subProducts, setSubProducts] = useState<SubProductEntry[]>([
    { name: 'A', duration: 1 },
    { name: 'B', duration: 1 }
  ]);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 400); // Allow time for mobile browser height adjustment when keyboard appears
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const addSubProduct = () => {
    const usedNames = subProducts.map(s => s.name.toUpperCase());
    let nextChar = 65; 
    while (usedNames.includes(String.fromCharCode(nextChar))) { nextChar++; }
    setSubProducts([...subProducts, { name: String.fromCharCode(nextChar), duration: 1 }]);
  };

  const removeSubProduct = (index: number) => {
    if (subProducts.length <= 1) return;
    setSubProducts(subProducts.filter((_, i) => i !== index));
  };

  const updateSubProduct = (index: number, field: keyof SubProductEntry, value: string | number) => {
    const newSubs = [...subProducts];
    if (field === 'name') {
      newSubs[index].name = (value as string).toUpperCase();
    } else {
      newSubs[index].duration = value as number;
    }
    setSubProducts(newSubs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const subTimes: { [k: string]: number } = {};
    subProducts.forEach(sub => {
      if (sub.name && sub.duration > 0) {
        subTimes[sub.name] = sub.duration;
      }
    });

    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      totalDemand: demand,
      deadline,
      subTimes,
      color: availableColors[Math.floor(Math.random() * availableColors.length)],
    };

    onAdd(newProject);
    setName('');
    setDemand(5);
    setDeadline(10);
    setSubProducts([{ name: 'A', duration: 1 }, { name: 'B', duration: 1 }]);
    setIsOpen(false);
  };

  return (
    <>
      {/* COMMAND TRIGGER - OPTIMIZED FOR MOBILE CENTER */}
      <button 
        onClick={() => setIsOpen(true)}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[5px] border-slate-950 bg-indigo-600 shadow-[0_12px_30px_-5px_rgba(79,70,229,0.7)] flex items-center justify-center text-white text-2xl active:scale-90 transition-all duration-200 z-[120]"
      >
        <i className="fas fa-plus"></i>
      </button>

      {/* MOBILE-FIRST MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/95 backdrop-blur-2xl touch-none">
          <div className="bg-slate-900 w-full flex flex-col max-h-[95dvh] rounded-t-[3rem] border-t border-slate-800 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-full duration-400 ease-out pointer-events-auto overflow-hidden pb-safe">
            
            <div className="px-8 py-6 flex justify-between items-center border-b border-slate-800/40">
              <div className="flex-1">
                <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">New <span className="text-indigo-400">Blueprint</span></h3>
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mt-0.5">Asset Registration</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 active:text-white"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-6 overflow-y-auto flex-1 space-y-6 touch-pan-y">
              
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset ID</label>
                <input 
                  ref={nameInputRef}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-lg font-black text-white focus:border-indigo-600 outline-none shadow-inner"
                  placeholder="BATCH_00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity</label>
                  <input 
                    type="number"
                    value={demand}
                    onChange={e => setDemand(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-lg font-black text-white outline-none"
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Deadline</label>
                  <input 
                    type="number"
                    value={deadline}
                    onChange={e => setDeadline(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-lg font-black text-white outline-none"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-800/20 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Workflow Steps</span>
                  <button 
                    type="button" 
                    onClick={addSubProduct} 
                    className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 active:scale-95"
                  >
                    Add <i className="fas fa-plus ml-1"></i>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {subProducts.map((sub, idx) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-[1.5rem] border border-slate-800 grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3">
                        <input 
                          type="text" 
                          value={sub.name}
                          onChange={e => updateSubProduct(idx, 'name', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 text-center text-[10px] font-black uppercase text-indigo-400 outline-none"
                          maxLength={3}
                        />
                      </div>
                      <div className="col-span-7">
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                           <input 
                            type="number" 
                            value={sub.duration}
                            onChange={e => updateSubProduct(idx, 'duration', parseInt(e.target.value) || 0)}
                            className="w-full bg-transparent text-[10px] font-black text-white outline-none"
                            min="1"
                          />
                          <span className="text-[7px] font-bold text-slate-600">UNITS</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button type="button" onClick={() => removeSubProduct(idx)} className="text-slate-700 active:text-red-500">
                          <i className="fas fa-trash text-sm"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-10"></div>
            </form>

            <div className="px-8 py-6 border-t border-slate-800/50 bg-slate-900/95">
              <button 
                onClick={handleSubmit}
                className="w-full bg-indigo-600 active:bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-[0.97] transition-all"
              >
                Integrate Production
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectForm;