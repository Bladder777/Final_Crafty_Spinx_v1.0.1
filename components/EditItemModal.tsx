import React, { useState, useRef, useEffect } from 'react';
import { CraftItem } from '../types';
import { XIcon } from './Icons';

interface EditItemModalProps {
  item: CraftItem | null;
  onClose: () => void;
  onSave: (updatedItem: CraftItem) => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price);
      setDescription(item.description);
      setPreviewUrl(null); // Reset preview when a new item is opened
      setFileName('');
    }
  }, [item]);

  if (!item) return null;

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

  const handleSave = () => {
    const updatedItem: CraftItem = {
      ...item,
      name,
      price: Number(price) || 0,
      description,
      imageUrl: previewUrl || item.imageUrl,
    };
    onSave(updatedItem);
  };
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
          onClose();
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
            onClick={onClose} 
            className="absolute top-4 right-4 bg-brand-white-ish rounded-full p-1 shadow-lg text-brand-text hover:text-brand-accent transition-colors z-20"
            aria-label="Close"
        >
            <XIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-display text-brand-accent mb-4 text-center sticky top-0 bg-brand-white-ish z-10 pb-2">Edit Item Details</h2>
        
        {/* Image Preview Section */}
        <div className="space-y-2 mb-4">
            <label className="block text-sm font-bold text-gray-700">Item Image</label>
            <div className="w-full h-56 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative">
                <img 
                    src={previewUrl || item.imageUrl} 
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
            />

            <div className="flex flex-col gap-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-brand-secondary text-brand-white-ish font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-all duration-200 shadow-sm"
                >
                    {previewUrl ? 'Change Image' : 'Choose New Image'}
                </button>
                {fileName && <p className="text-xs text-center text-gray-500 truncate">Selected: {fileName}</p>}
            </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
            <div>
                <label htmlFor="itemName" className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                <input 
                    type="text" 
                    id="itemName" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent"
                />
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
                <label htmlFor="itemDescription" className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea 
                    id="itemDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-accent focus:border-brand-accent resize-none"
                />
            </div>
        </div>

        <button
            onClick={handleSave}
            className="w-full bg-brand-accent text-brand-white-ish font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-all duration-200 mt-6 shadow-md"
        >
            Save Changes & Close
        </button>
      </div>
    </div>
  );
};

export default EditItemModal;