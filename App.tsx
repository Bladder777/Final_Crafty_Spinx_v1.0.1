
import React, { useState, useEffect } from 'react';
import { CraftItem, View } from './types';
import { CRAFT_ITEMS } from './constants';
import CatalogView from './components/CatalogView';
import CartView from './components/OrderView';
import Navbar from './components/Navbar';
import SettingsModal from './components/SettingsModal';
import SwipeView from './components/SwipeView';
import FloatingActionMenu from './components/FloatingActionMenu';
import WishlistView from './components/WishlistView';
import EditItemModal from './components/EditItemModal';
import AddItemModal from './components/AddItemModal';
import ConfirmationModal from './components/ConfirmationModal';
import { supabase } from './services/supabaseClient';

const LOGO_URL = "/logo.png"; 
const SLOGAN = "Huggables - Joy knitted by hand";

const App: React.FC = () => {
  const [items, setItems] = useState<CraftItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CraftItem[]>([]);
  const [wishlist, setWishlist] = useState<Set<number>>(() => {
    try {
      const savedWishlist = window.localStorage.getItem('wishlistItems');
      return savedWishlist ? new Set(JSON.parse(savedWishlist)) : new Set();
    } catch (error) {
      console.error("Could not load wishlist from localStorage", error);
      return new Set();
    }
  });
  
  const [currentView, setCurrentView] = useState<View>('catalog');
  const [catalogMode, setCatalogMode] = useState<'swipe' | 'grid'>('grid'); 
  const [theme, setTheme] = useState('pastel');
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CraftItem | null>(null);
  const [isAddItemModalOpen, setAddItemModalOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void; } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // --- Supabase Data Fetching ---
  const fetchItems = async () => {
    setIsLoading(true);
    setConnectionError(null);
    setIsOffline(false);
    try {
      // We explicitly quote "imageUrl" and "modelUrl" to respect the camelCase column names
      // defined in the database schema.
      const { data, error } = await supabase
        .from('craft_items')
        .select(`
          id,
          name,
          description,
          price,
          "imageUrl",
          category,
          "modelUrl"
        `)
        .order('id', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setItems(data as CraftItem[]);
      } else {
        setItems([]); 
      }
    } catch (error: any) {
      console.error('Error fetching items from Supabase:', JSON.stringify(error, null, 2));
      
      const errorCode = error?.code;
      const errorMessage = error?.message || '';

      // Handle specific known errors
      if (errorMessage.includes("Invalid API key") || errorCode === "PGRST301") {
          setConnectionError("Invalid API Key. Please check services/supabaseClient.ts");
      } else if (errorCode === "42P01") {
          setConnectionError("Table 'craft_items' missing. Please run the SQL script provided.");
      } else if (errorCode === "42703") {
          setConnectionError("Database Schema Mismatch. Columns 'imageUrl' or 'modelUrl' missing. Please run the SQL script.");
      } else if (errorCode === "57014") {
          // Timeout error - DB is waking up
          console.warn("Database timeout (Cold Start). Switching to Offline Mode.");
          setIsOffline(true);
          setItems(CRAFT_ITEMS);
          // Optional: You could show a specific toast here, but we'll stick to the offline indicator.
      } else {
          console.warn("Database connection issue. Switching to Offline Mode.");
          setIsOffline(true);
          setItems(CRAFT_ITEMS);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // --- Local Persistence for User Preferences (Wishlist/Cart) ---
  useEffect(() => {
    try {
        window.localStorage.setItem('wishlistItems', JSON.stringify(Array.from(wishlist)));
    } catch (error) {
        console.error("Could not save wishlist to localStorage", error);
    }
  }, [wishlist]);

  const handleAdminLogin = (password: string) => {
    if (password === '23568') {
      setIsAdminMode(true);
      alert("Admin mode enabled.");
      setSettingsOpen(false);
    } else {
      alert("Incorrect password.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminMode(false);
    alert("Admin mode disabled.");
    setSettingsOpen(false);
  };

  const handleAddToCart = (item: CraftItem) => {
    if (!cartItems.some(i => i.id === item.id)) {
      setCartItems(prevItems => [...prevItems, item]);
    }
  };
  
  const handleRemoveFromCart = (itemId: number) => {
      setCartItems(prevItems => prevItems.filter(i => i.id !== itemId));
  };
  
  const handleToggleWishlist = (itemId: number) => {
    setWishlist(prevWishlist => {
        const newWishlist = new Set(prevWishlist);
        if (newWishlist.has(itemId)) {
            newWishlist.delete(itemId);
        } else {
            newWishlist.add(itemId);
        }
        return newWishlist;
    });
  };

  const handleSendInquiry = () => {
    setCartItems([]);
    setCurrentView('catalog');
  };
  
  const handleSetTheme = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.className = `theme-${newTheme}`;
  }
  
  const handleSaveItem = async (updatedItem: CraftItem) => {
    // Optimistic UI update
    setItems(prevItems =>
        prevItems.map(i => (i.id === updatedItem.id ? updatedItem : i))
    );
    setEditingItem(null);

    if (isOffline) {
        alert("Offline Mode: Changes saved locally (will disappear on refresh).");
        return;
    }

    try {
        // DB Update
        const { error } = await supabase
            .from('craft_items')
            .update({
                name: updatedItem.name,
                description: updatedItem.description,
                price: updatedItem.price,
                imageUrl: updatedItem.imageUrl, 
                category: updatedItem.category
            })
            .eq('id', updatedItem.id);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating item:", error);
        setIsOffline(true);
        alert("Database connection lost. Change saved locally (Offline Mode).");
    }
  };
  
  const handleDeleteItem = (itemId: number) => {
    requestConfirmation(
        'Are you sure you want to permanently delete this item?',
        async () => {
            // Optimistic UI Update
            setItems(prev => prev.filter(i => i.id !== itemId));
            setCartItems(prev => prev.filter(i => i.id !== itemId));
            setWishlist(prev => {
                const newWishlist = new Set(prev);
                newWishlist.delete(itemId);
                return newWishlist;
            });

            if (isOffline) {
                alert("Offline Mode: Item deleted locally.");
                return;
            }

            try {
                // DB Delete
                const { error } = await supabase
                    .from('craft_items')
                    .delete()
                    .eq('id', itemId);
                
                if (error) throw error;
            } catch (error) {
                console.error("Error deleting item:", error);
                setIsOffline(true);
                alert("Database connection lost. Item deleted locally (Offline Mode).");
            }
        }
    );
  };

  const handleAddItem = async (newItemData: Omit<CraftItem, 'id'>) => {
    // Optimistic / Local function
    const addLocally = () => {
        const newItem: CraftItem = {
            id: Date.now(), // Temporary ID
            ...newItemData
        };
        setItems(prev => [newItem, ...prev]);
        setAddItemModalOpen(false);
    };

    if (isOffline) {
        addLocally();
        alert("Offline Mode: Item added locally.");
        return;
    }

    try {
        // DB Insert
        const { data, error } = await supabase
            .from('craft_items')
            .insert([{
                name: newItemData.name,
                description: newItemData.description,
                price: newItemData.price,
                imageUrl: newItemData.imageUrl,
                category: newItemData.category
            }])
            .select();

        if (error) throw error;

        if (data) {
            // Transform response to CraftItem
            const newItem: CraftItem = {
                id: data[0].id,
                name: data[0].name,
                description: data[0].description,
                price: data[0].price,
                imageUrl: data[0].imageUrl, // Accessing camelCase property returned by DB
                category: data[0].category,
                modelUrl: data[0].modelUrl
            };
            setItems(prev => [newItem, ...prev]);
        }
        
        setAddItemModalOpen(false);
    } catch (error) {
        console.error("Error adding item:", error);
        addLocally();
        setIsOffline(true);
        alert("Database error. Item added locally (Offline Mode).");
    }
  };

  const handleResetToDefaults = () => {
     alert("Feature disabled in Cloud Mode to prevent data loss.");
  };

  const requestConfirmation = (message: string, onConfirm: () => void) => {
    setConfirmation({
        message,
        onConfirm: () => {
            onConfirm();
            setConfirmation(null);
        }
    });
  };

  const wishlistItems = items.filter(item => wishlist.has(item.id));
  const cartItemIds = new Set(cartItems.map(i => i.id));

  // If there is a critical connection error, show it clearly
  if (connectionError) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
              <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg text-center">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h1 className="text-2xl font-bold text-red-600 mb-2">Setup Required</h1>
                  <p className="text-gray-700 mb-4">{connectionError}</p>
                  {(connectionError.includes("SQL") || connectionError.includes("Schema")) && (
                     <div className="text-left bg-gray-100 p-4 rounded text-xs overflow-auto font-mono text-gray-600 max-h-40">
                        {`-- Run this in Supabase SQL Editor:
CREATE TABLE craft_items (
  id bigint generated by default as identity primary key,
  name text not null,
  description text,
  price numeric not null,
  "imageUrl" text,
  category text,
  "modelUrl" text
);
ALTER TABLE craft_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON craft_items FOR SELECT USING (true);
CREATE POLICY "Public Write" ON craft_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON craft_items FOR UPDATE USING (true);
CREATE POLICY "Public Delete" ON craft_items FOR DELETE USING (true);`}
                     </div>
                  )}
              </div>
          </div>
      )
  }

  return (
    <div className={`theme-${theme} min-h-screen bg-brand-background font-body text-brand-text flex flex-col`}>
      <header className="p-4 flex flex-col md:flex-row justify-center items-center shadow-md bg-brand-white-ish/80 backdrop-blur-sm sticky top-0 z-30 border-b border-brand-primary/20 gap-3 md:gap-6">
         {/* Updated Logo Container: Flexible width/height, no rounded cropping for wide text logos */}
         <div className="h-16 md:h-20 w-auto flex-shrink-0 flex items-center justify-center overflow-hidden">
            <img 
              src={LOGO_URL} 
              alt="Crafty Spinx Logo" 
              className="h-full w-auto object-contain"
              onError={(e) => {
                e.currentTarget.onerror = null; 
                e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/3081/3081840.png"; // Fallback icon
              }} 
            />
        </div>
        <div className="text-center md:text-left">
             {/* Hid title if logo is used, or can be kept as text fallback/accompaniment. Keeping for now as per design. */}
             <h1 className="text-3xl md:text-4xl font-display text-brand-accent select-none drop-shadow-sm leading-tight hidden md:block">Crafty Spinx</h1>
             <p className="text-sm md:text-base font-semibold text-brand-primary italic mt-1">{SLOGAN}</p>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-4 md:p-6 relative max-w-6xl">
        {isLoading ? (
             <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-brand-secondary border-t-transparent rounded-full animate-spin"></div>
             </div>
        ) : (
            <>
                {currentView === 'catalog' && (
                catalogMode === 'swipe' ? (
                    <SwipeView 
                    items={items} 
                    onAddToCart={handleAddToCart}
                    cartItemIds={cartItemIds}
                    wishlist={wishlist}
                    onToggleWishlist={handleToggleWishlist}
                    onEditItem={setEditingItem}
                    onDeleteItem={handleDeleteItem}
                    isAdminMode={isAdminMode}
                    />
                ) : (
                    <CatalogView 
                    items={items} 
                    onAddToCart={handleAddToCart} 
                    cartItemIds={cartItemIds}
                    wishlist={wishlist}
                    onToggleWishlist={handleToggleWishlist}
                    onEditItem={setEditingItem}
                    onDeleteItem={handleDeleteItem}
                    isAdminMode={isAdminMode}
                    />
                )
                )}
                {currentView === 'cart' && (
                    <CartView 
                        cartItems={cartItems} 
                        onSendInquiry={handleSendInquiry}
                        onRemoveItem={handleRemoveFromCart}
                    />
                )}
                {currentView === 'wishlist' && (
                    <WishlistView
                        wishlistItems={wishlistItems}
                        onToggleWishlist={handleToggleWishlist}
                        onAddToCart={handleAddToCart}
                        cartItemIds={cartItemIds}
                        onEditItem={setEditingItem}
                        onDeleteItem={handleDeleteItem}
                        isAdminMode={isAdminMode}
                    />
                )}
            </>
        )}
      </main>
      
      {currentView === 'catalog' && (
        <FloatingActionMenu 
            isGridMode={catalogMode === 'grid'}
            onToggleView={() => setCatalogMode(mode => mode === 'grid' ? 'swipe' : 'grid')}
            onOpenSettings={() => setSettingsOpen(true)}
            onAddItem={() => setAddItemModalOpen(true)}
            isAdminMode={isAdminMode}
        />
      )}

      {/* Admin Status Indicator */}
      {isAdminMode && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold shadow-lg animate-fade-in z-30 border text-center whitespace-nowrap flex items-center gap-2 ${isOffline ? 'bg-yellow-100 text-yellow-800 border-yellow-400' : 'bg-green-100 text-green-800 border-green-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></span>
            Admin Mode: {isOffline ? 'Offline (Check DB)' : 'Live Database'}
        </div>
      )}

      <Navbar 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        itemCount={cartItems.length}
        wishlistCount={wishlist.size}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentTheme={theme}
        onSetTheme={handleSetTheme}
        isAdminMode={isAdminMode}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
        items={items}
        onImportItems={() => {}} // Disabled in cloud mode
        onResetToDefaults={handleResetToDefaults}
        requestConfirmation={requestConfirmation}
      />
      
      <EditItemModal 
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveItem}
      />
      
      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setAddItemModalOpen(false)}
        onSave={handleAddItem}
      />

      <ConfirmationModal
        isOpen={!!confirmation}
        title="Please Confirm"
        message={confirmation?.message || ''}
        onConfirm={confirmation?.onConfirm}
        onCancel={() => setConfirmation(null)}
      />
    </div>
  );
};

export default App;
