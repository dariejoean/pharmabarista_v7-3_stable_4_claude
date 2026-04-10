import React, { useState, useEffect } from 'react';
import { ShotData, ListItem } from '../types';
import { getAllProducts, getSetting } from '../services/db';
import { SelectionModal } from './SelectionModal';
import { PencilIcon } from '@heroicons/react/24/solid';

interface EditableSelectionRowProps {
    label: string;
    field: keyof ShotData;
    value: string;
    category: 'machine' | 'bean' | 'water' | 'grinder' | 'basket' | 'tamper';
    onSave: (field: keyof ShotData, val: string) => void;
}

export const EditableSelectionRow: React.FC<EditableSelectionRowProps> = ({ label, field, value, category, onSave }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [items, setItems] = useState<string[]>([]);
    const [itemsData, setItemsData] = useState<any[]>([]);

    useEffect(() => {
        const fetchItems = async () => {
            if (category === 'machine' || category === 'bean') {
                const products = await getAllProducts(category);
                setItems(products.map(p => p.name));
                setItemsData(products);
            } else {
                let settingKey = `${category}s_list`;
                if (category === 'tamper') settingKey = 'tampers_list';
                const list = await getSetting(settingKey) as ListItem[] || [];
                setItems(list.map(l => l.label));
                setItemsData([]);
            }
        };
        if (isModalOpen) {
            fetchItems();
        }
    }, [isModalOpen, category]);

    return (
        <>
            <div 
                className="flex justify-between items-center border-b border-white/5 py-2.5 cursor-pointer group hover:bg-white/10 -mx-3 px-3 transition-colors rounded-lg"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest text-left">{label}</span>
                    <span className="text-sm font-bold text-on-surface text-left truncate leading-tight">{value || '-'}</span>
                </div>
                <PencilIcon className="w-3 h-3 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {isModalOpen && (
                <SelectionModal
                    title={`Selectează ${label}`}
                    items={items}
                    itemsData={itemsData}
                    selectedItem={value}
                    onSelect={(item) => {
                        onSave(field, item);
                        setIsModalOpen(false);
                    }}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </>
    );
};
