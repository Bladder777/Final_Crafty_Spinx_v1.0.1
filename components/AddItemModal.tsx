import React, { useState, useRef } from 'react';
import { CraftItem, Category } from '../types';
import { XIcon } from './Icons';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newItemData: Omit<CraftItem, 'id'>) => void;
}

const CATEGORIES: Category[] = ['Crochet', 'Decor', 'Random'];
const PLACEHOLDER_IMAGE_PREVIEW = 'https://i.ibb.co/p3TQd17/image-placeholder.png';


const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Crochet');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
      setName('');
      setPrice(0);
      setDescription('');
      setCategory('Crochet');
      setPreviewUrl(null);
      setFileName('');
  };

  const handleSave = () => {
    if (!name || !description || !previewUrl) {
        alert('Please fill out the name, description, and upload an image.');
        return;
    }
    
    const newItemData: Omit<CraftItem, 'id'> = {
      name,
      price: Number(price) || 0,
      description,
      imageUrl: previewUrl,
      category,
    };
    onSave(newItemData);
    resetForm();
  };
  
  const handleClose = () => {
      resetForm();
      onClose();
  }
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
          handleClose();
      }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in p-4"
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-brand-white-ish rounded-2xl shadow-xl p-6 w-full max-w-md m-auto flex flex-col relative max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button 
            onClick={handleClose} 
            className="absolute top-4 right-4 bg-brand-white-ish rounded-full p-1 shadow-lg text-brand-text hover:text-brand-accent transition-colors z-20"
            aria-label="Close"
        >
            <XIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-display text-brand-accent mb-4 text-center sticky top-0 bg-brand-white-ish z-10 pb-2">Add New Item</h2>
        
        {/* Image Preview */}
        <div className="space-y-2 mb-4">
             <label className="block text-sm font-bold text-gray-700">Item Image*</label>
             <div className="w-full h-56 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative">
                <img 
                    src={previewUrl || PLACEHOLDER_IMAGE_PREVIEW} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                />
            </div>
            
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                required
            />

            <div className="flex flex-col gap-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-brand-secondary text-brand-white-ish font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-all duration-200 shadow-sm"
                >
                    {previewUrl ? 'Change Image' : 'Choose Image*'}
                </button>
                {fileName && <p className="text-xs text-center text-gray-500 truncate">Selected: {fileName}</p>}
            </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
            <div>
                <label htmlFor="itemName" className="block text-sm font-bold text-gray-700 mb-1">Name*</label>
                <input 
                    type="text" 
                    id="itemName" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent"
                    required
                />
            </div>
             <div>
                <label htmlFor="itemCategory" className="block text-sm font-bold text-gray-700 mb-1">Category*</label>
                <select
                    id="itemCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent"
                >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="itemPrice" className="block text-sm font-bold text-gray-700 mb-1">Price (R)</label>
                <input 
                    type="number" 
                    id="itemPrice"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent"
                />
            </div>
            <div>
                <label htmlFor="itemDescription" className="block text-sm font-bold text-gray-700 mb-1">Description*</label>
                <textarea 
                    id="itemDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent resize-none"
                    required
                />
            </div>
        </div>

        <button
            onClick={handleSave}
            className="w-full bg-brand-accent text-brand-white-ish font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-all duration-200 mt-6 shadow-md"
        >
            Add Item & Close
        </button>
      </div>
    </div>
  );
};

export default AddItemModal;