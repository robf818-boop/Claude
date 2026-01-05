import React, { useState, useMemo } from 'react';
import { AgeLevel } from '../types';
import { rules } from '../data/rules';
import { Search, BookOpen, Filter } from 'lucide-react';

interface RulesHandbookProps {
  ageLevel: AgeLevel;
}

export const RulesHandbook: React.FC<RulesHandbookProps> = ({ ageLevel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Get unique organizations and categories
  const organizations = useMemo(() => {
    const orgs = new Set(rules.map((r) => r.organization));
    return ['all', ...Array.from(orgs)];
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(rules.map((r) => r.category));
    return ['all', ...Array.from(cats)];
  }, []);

  // Filter rules
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      // Check age level
      const ageMatch = !rule.ageLevel || rule.ageLevel.includes(ageLevel);

      // Check organization
      const orgMatch = selectedOrg === 'all' || rule.organization === selectedOrg;

      // Check category
      const catMatch =
        selectedCategory === 'all' || rule.category === selectedCategory;

      // Check search term
      const searchMatch =
        !searchTerm ||
        rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.category.toLowerCase().includes(searchTerm.toLowerCase());

      return ageMatch && orgMatch && catMatch && searchMatch;
    });
  }, [ageLevel, selectedOrg, selectedCategory, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search rules by keyword..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Filter size={16} />
            Organization
          </label>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {organizations.map((org) => (
              <option key={org} value={org}>
                {org === 'all' ? 'All Organizations' : org}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Filter size={16} />
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Found {filteredRules.length} rule(s) for {ageLevel.toUpperCase()} level
      </div>

      {/* Rules List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredRules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white border border-gray-300 rounded-lg overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedRule(expandedRule === rule.id ? null : rule.id)
              }
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{rule.title}</h3>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      {rule.organization}
                    </span>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {rule.category}
                    </span>
                  </div>
                </div>
                <div className="text-gray-400">
                  {expandedRule === rule.id ? '−' : '+'}
                </div>
              </div>
            </button>

            {expandedRule === rule.id && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {rule.content}
                </p>
                {rule.ageLevel && (
                  <div className="mt-3 text-xs text-gray-500">
                    Applicable to: {rule.ageLevel.map(a => a.toUpperCase()).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredRules.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No rules found matching your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};
