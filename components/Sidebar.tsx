import React from 'react';
import { ActiveView } from '../App';
import BuildingOfficeIcon from './icons/BuildingOfficeIcon';
import FireIcon from './icons/FireIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

const navigation = [
  { name: 'AREAS', view: 'areas' as ActiveView, icon: BuildingOfficeIcon },
  { name: 'EXTINTORES', view: 'extintores' as ActiveView, icon: FireIcon },
  { name: 'BOTIQUINES', view: 'botiquines' as ActiveView, icon: PlusCircleIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  return (
    <div className="flex w-64 flex-col bg-slate-900 border-r border-slate-800">
      <div className="flex flex-shrink-0 items-center h-16 px-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white">AUDITORIAS</h1>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-2 px-4 py-4">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveView(item.view)}
              className={`group flex items-center px-3 py-2.5 text-sm font-semibold rounded-md w-full text-left transition-colors duration-200 ${
                activeView === item.view
                  ? 'bg-indigo-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon
                className={`mr-3 h-6 w-6 flex-shrink-0 ${
                  activeView === item.view ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`}
                aria-hidden="true"
              />
              {item.name}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
