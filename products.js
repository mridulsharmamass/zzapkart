// Categories — har category ka apna page banta hai: category.html?c=<slug>
// Nayi category add karni ho to yahan add karo aur products mein wahi "category" naam use karo
const CATEGORIES = [
  { name: "Electronics", slug: "electronics", emoji: "📱", tagline: "Phones, audio, smart gadgets aur bahut kuch",  gradient: "linear-gradient(120deg, #1e0b3d, #6d28d9)" },
  { name: "Fashion",     slug: "fashion",     emoji: "👗", tagline: "Trendy kapde, shoes aur accessories",          gradient: "linear-gradient(120deg, #ff2d95, #ff8a5c)" },
  { name: "Home",        slug: "home",        emoji: "🏠", tagline: "Ghar ko sajao — kitchen, decor aur lighting",  gradient: "linear-gradient(120deg, #4a1a9e, #c026d3)" },
  { name: "Sports",      slug: "sports",      emoji: "🏏", tagline: "Fit raho — cricket, football, yoga gear",      gradient: "linear-gradient(120deg, #f2611d, #ff2d95)" },
  { name: "Books",       slug: "books",       emoji: "📚", tagline: "Novels, notebooks aur padhai ka saaman",       gradient: "linear-gradient(120deg, #2d0f6b, #b0185f)" },
  { name: "Accessories", slug: "accessories", emoji: "👜", tagline: "Bags, watches, jewellery aur eyewear",            gradient: "linear-gradient(120deg, #7a1fa2, #ff2d95)" },
  { name: "Beauty",      slug: "beauty",      emoji: "💄", tagline: "Skin care, makeup, hair care aur fragrances",     gradient: "linear-gradient(120deg, #c2185b, #ff8a5c)" },
  { name: "Grocery",     slug: "grocery",     emoji: "🛒", tagline: "Chai, masale, dry fruits aur roz ka saamaan",     gradient: "linear-gradient(120deg, #2d0f6b, #f2611d)" },
  { name: "Health",      slug: "health",      emoji: "💊", tagline: "Vitamins, ayurveda aur health devices",           gradient: "linear-gradient(120deg, #4a1a9e, #ff5c8a)" },
  { name: "Toys",        slug: "toys",        emoji: "🧸", tagline: "Toys, games aur baby care",                       gradient: "linear-gradient(120deg, #6d28d9, #ffb35c)" },
];

// Product catalog — yahan naye products add/edit kar sakte ho
const PRODUCTS = [
  { id: 1,  name: "Wireless Headphones",   category: "Electronics", price: 1999,  mrp: 3499,  rating: 4.3, emoji: "🎧", color: "#e0e7ff" },
  { id: 2,  name: "Smart Watch",           category: "Electronics", price: 2799,  mrp: 4999,  rating: 4.1, emoji: "⌚", color: "#fce7f3" },
  { id: 3,  name: "Bluetooth Speaker",     category: "Electronics", price: 1499,  mrp: 2299,  rating: 4.4, emoji: "🔊", color: "#dcfce7" },
  { id: 4,  name: "Smartphone 5G",         category: "Electronics", price: 15999, mrp: 19999, rating: 4.5, emoji: "📱", color: "#fef3c7" },
  { id: 5,  name: "Laptop Backpack",       category: "Fashion",     price: 899,   mrp: 1599,  rating: 4.2, emoji: "🎒", color: "#e0f2fe" },
  { id: 6,  name: "Running Shoes",         category: "Fashion",     price: 2499,  mrp: 3999,  rating: 4.6, emoji: "👟", color: "#ffe4e6" },
  { id: 7,  name: "Cotton T-Shirt",        category: "Fashion",     price: 399,   mrp: 799,   rating: 4.0, emoji: "👕", color: "#ede9fe" },
  { id: 8,  name: "Sunglasses",            category: "Fashion",     price: 699,   mrp: 1299,  rating: 4.1, emoji: "🕶️", color: "#f1f5f9" },
  { id: 9,  name: "Coffee Maker",          category: "Home",        price: 3299,  mrp: 4599,  rating: 4.3, emoji: "☕", color: "#fef9c3" },
  { id: 10, name: "Table Lamp",            category: "Home",        price: 799,   mrp: 1199,  rating: 4.0, emoji: "💡", color: "#ecfccb" },
  { id: 11, name: "Indoor Plant",          category: "Home",        price: 349,   mrp: 599,   rating: 4.5, emoji: "🪴", color: "#d1fae5" },
  { id: 12, name: "Cricket Bat",           category: "Sports",      price: 1799,  mrp: 2499,  rating: 4.4, emoji: "🏏", color: "#ffedd5" },
  { id: 13, name: "Football",              category: "Sports",      price: 599,   mrp: 999,   rating: 4.2, emoji: "⚽", color: "#e2e8f0" },
  { id: 14, name: "Yoga Mat",              category: "Sports",      price: 499,   mrp: 899,   rating: 4.3, emoji: "🧘", color: "#fae8ff" },
  { id: 15, name: "Novel Book Set",        category: "Books",       price: 899,   mrp: 1499,  rating: 4.7, emoji: "📚", color: "#fee2e2" },
  { id: 16, name: "Notebook Pack",         category: "Books",       price: 249,   mrp: 399,   rating: 4.1, emoji: "📓", color: "#cffafe" },
];
