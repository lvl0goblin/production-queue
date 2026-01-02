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
      }, 300); // More time for mobile keyboard pop
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
      {/* PERFECTLY CENTERED COMMAND TRIGGER */}
      <button 
        onClick={() => setIsOpen(true)}
        className="w-20 h-20 rounded-full border-[6px] border-slate-950 bg-indigo-600 shadow-[0_15px_40px_-5px_rgba(79,70,229,0.8)] flex items-center justify-center text-white text-3xl active:scale-75 transition-all duration-300 z-[110]"
      >
        <i className="fas fa-plus"></i>
      </button>

      {/* MOBILE-OPTIC MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/90 backdrop-blur-3xl touch-none">
          <div className="bg-slate-900 w-full flex flex-col max-h-[96vh] rounded-t-[3.5rem] border-t-2 border-slate-800 shadow-[0_-30px_100px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-full duration-500 ease-out pointer-events-auto overflow-hidden">
            
            <div className="px-10 py-8 flex justify-between items-center border-b border-slate-800/40">
              <div className="flex-1">
                <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">New <span className="text-indigo-400">Blueprint</span></h3>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mt-1">Production Run Config</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 text-slate-400 active:text-white transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-10 py-8 overflow-y-auto flex-1 space-y-8 touch-pan-y">
              
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Name</label>
                <input 
                  ref={nameInputRef}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-800 p-5 rounded-3xl text-xl font-black text-white focus:border-indigo-600 outline-none placeholder:text-slate-800 shadow-inner"
                  placeholder="E.G. TURBINE_7"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity</label>
                  <input 
                    type="number"
                    value={demand}
                    onChange={e => setDemand(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border-2 border-slate-800 p-5 rounded-3xl text-xl font-black text-white focus:border-indigo-600 outline-none shadow-inner"
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Deadline</label>
                  <input 
                    type="number"
                    value={deadline}
                    onChange={e => setDeadline(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border-2 border-slate-800 p-5 rounded-3xl text-xl font-black text-white focus:border-indigo-600 outline-none shadow-inner"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex justify-between items-center bg-slate-800/30 p-4 rounded-3xl border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation Workflow</span>
                  <button 
                    type="button" 
                    onClick={addSubProduct} 
                    className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 active:scale-95"
                  >
                    Add Step <i className="fas fa-plus ml-1"></i>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {subProducts.map((sub, idx) => (
                    <div key={idx} className="bg-slate-950 p-5 rounded-[2rem] border-2 border-slate-800 grid grid-cols-12 gap-4 items-center shadow-lg">
                      <div className="col-span-3">
                        <span className="block text-[8px] font-black text-slate-600 uppercase mb-2">ID</span>
                        <input 
                          type="text" 
                          value={sub.name}
                          onChange={e => updateSubProduct(idx, 'name', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 text-center text-sm font-black uppercase text-indigo-400 outline-none"
                          maxLength={3}
                          required
                        />
                      </div>

                      <div className="col-span-7">
                        <span className="block text-[8px] font-black text-slate-600 uppercase mb-2">Duration</span>
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
                           <input 
                            type="number" 
                            value={sub.duration}
                            onChange={e => updateSubProduct(idx, 'duration', parseInt(e.target.value) || 0)}
                            className="w-full bg-transparent text-sm font-black text-white outline-none"
                            min="1"
                            required
                          />
                          <span className="text-[8px] font-bold text-slate-600 ml-2">UNITS</span>
                        </div>
                      </div>

                      <div className="col-span-2 flex justify-end">
                        <button 
                          type="button" 
                          onClick={() => removeSubProduct(idx)} 
                          className="w-12 h-12 flex items-center justify-center text-slate-700 active:text-red-500 transition-colors"
                        >
                          <i className="fas fa-trash text-lg"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-20"></div>
            </form>

            <div className="px-10 py-10 border-t border-slate-800/50 bg-slate-900/95 shadow-2xl">
              <button 
                onClick={handleSubmit}
                className="w-full bg-indigo-600 active:bg-indigo-500 text-white py-6 rounded-3xl font-black uppercase text-sm tracking-[0.3em] shadow-[0_20px_50px_-10px_rgba(79,70,229,0.5)] active:scale-[0.96] transition-all"
              >
                Integrate Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectForm;