import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music2, Users, Calendar, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';

type CriteriaType = 'genre' | 'artist' | 'year';

interface CriteriaOption {
  id: CriteriaType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const criteriaOptions: CriteriaOption[] = [
  {
    id: 'genre',
    name: 'By Genre',
    description: 'Group songs by their musical genre',
    icon: <Music2 className="w-7 h-7" />,
  },
  {
    id: 'artist',
    name: 'By Artist',
    description: 'Create playlists for your favorite artists',
    icon: <Users className="w-7 h-7" />,
  },
  {
    id: 'year',
    name: 'By Year',
    description: 'Organize songs by release year',
    icon: <Calendar className="w-7 h-7" />,
  },
];

export default function CriteriaSelection() {
  const [selectedCriteria, setSelectedCriteria] = useState<CriteriaType | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedCriteria) {
      navigate('/create', { state: { criteria: selectedCriteria } });
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="relative text-center mb-12">
          <div className="absolute inset-0 -top-24 bg-gradient-to-b from-emerald-500/20 via-emerald-500/5 to-transparent blur-3xl" />
          <div className="relative">
            <h1 className="text-4xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-200">
              How would you like to organize?
            </h1>
            <p className="text-lg text-emerald-200/80">
              Choose a criteria to transform your liked songs into curated playlists
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {criteriaOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedCriteria(option.id)}
              className={`group relative w-full p-6 rounded-xl border-2 text-left transition-all duration-200 ${
                selectedCriteria === option.id
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 hover:border-emerald-500/50 bg-gradient-to-br from-white/[0.075] to-white/[0.035]'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative flex items-start">
                <div className={`flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${
                  selectedCriteria === option.id
                    ? 'from-emerald-400/30 to-emerald-600/30'
                    : 'from-emerald-400/20 to-emerald-600/20'
                }`}>
                  <div className={`${
                    selectedCriteria === option.id ? 'text-emerald-400' : 'text-emerald-500/80'
                  }`}>
                    {option.icon}
                  </div>
                </div>
                <div className="ml-6 flex-1">
                  <h3 className="text-xl font-semibold text-white mb-1">{option.name}</h3>
                  <p className="text-emerald-100/60">{option.description}</p>
                </div>
                <ChevronRight className={`w-6 h-6 self-center transition-transform ${
                  selectedCriteria === option.id ? 'text-emerald-400 translate-x-1' : 'text-emerald-500/50'
                }`} />
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedCriteria}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-500 hover:to-emerald-500 transition-all duration-200 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
        >
          Continue
        </button>
      </div>
    </Layout>
  );
}