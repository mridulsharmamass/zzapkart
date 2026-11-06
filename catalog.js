// =====================================================================
// Zzapkart Catalog: category tree, listing form schema, rules, fees
//
// Based on our seller policy research (Nov 2026):
//  - "common compulsory" details for every listing (Section 7)
//  - extra compulsory + good-to-have fields per category (Section 10–13)
//  - image rules (Section 8), price / GST / HSN / compliance (Section 9)
//  - approval for restricted categories (Section 14)
//  - rules that help avoid rejection (Section 15)
// =====================================================================

// ---------- Shared dropdown values ----------
const OPT = {
  colors: ["Beige", "Black", "Blue", "Brown", "Cream", "Dark Blue", "Dark Green", "Gold", "Green", "Grey", "Khaki", "Lavender", "Light Blue", "Light Green", "Maroon", "Multicolor", "Mustard", "Navy Blue", "Olive", "Orange", "Peach", "Pink", "Purple", "Red", "Silver", "Teal", "Transparent", "White", "Wine", "Yellow"],
  idealFor: ["Men", "Women", "Boys", "Girls", "Unisex", "Couple", "Baby Boys", "Baby Girls"],
  fabric: ["Pure Cotton", "Cotton Blend", "Organic Cotton", "Polycotton", "Polyester", "Viscose Rayon", "Linen Blend", "Lyocell", "Modal", "Nylon", "Elastane", "Bamboo", "Hemp", "Wool Blend", "Denim", "Silk Blend", "Georgette", "Chiffon", "Crepe", "Satin"],
  pattern: ["Solid", "Printed", "Graphic Print", "Typography", "Striped", "Checkered", "Colorblock", "Self Design", "Embroidered", "Floral Print", "Geometric Print", "Abstract", "Tie & Dye", "Washed", "Animal Print", "Camouflage"],
  fit: ["Regular", "Slim", "Oversized", "Relaxed", "Comfort Fit", "Athletic Fit", "Boxy", "Compression", "Skinny", "Loose"],
  sleeve: ["Half Sleeve", "Full Sleeve", "3/4 Sleeve", "Sleeveless", "Short Sleeve", "Roll-up Sleeve"],
  neck: ["Round Neck", "V Neck", "Polo Neck", "Henley Neck", "Hooded", "High Neck", "Mandarin Collar", "Spread Collar", "Button Down Collar", "Boat Neck", "Scoop Neck", "Square Neck", "Turtle Neck"],
  occasion: ["Casual", "Formal", "Party", "Festive", "Sports", "Lounge Wear", "Beach Wear", "Wedding"],
  yesNo: ["Yes", "No"],
  packOf: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  fabricCare: ["Machine Wash", "Gentle Machine Wash", "Hand Wash", "Cold Water Wash Only", "Dry Clean Only", "Do not Bleach"],
  countries: ["India", "Bangladesh", "China", "France", "Germany", "Indonesia", "Italy", "Japan", "Malaysia", "Nepal", "South Korea", "Sri Lanka", "Taiwan", "Thailand", "Turkey", "UAE", "United Kingdom", "USA", "Vietnam"],
  sla: ["1", "2", "3", "4", "5", "6", "7"],
};

// Size lists (variant axis)
const SIZE_SETS = {
  apparel: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"],
  bottom: ["26", "28", "30", "32", "34", "36", "38", "40", "42"],
  ethnic: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"],
  kids: ["0-1Y", "1-2Y", "2-3Y", "3-4Y", "4-5Y", "5-6Y", "6-8Y", "8-10Y", "10-12Y", "12-14Y"],
  footwear: ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"],
};

// ---------- Restricted categories (need approval) — Section 14 ----------
const RESTRICTED = {
  fssai: { label: "Grocery & Food", license: "FSSAI License", pattern: /^\d{14}$/, hint: "14-digit FSSAI license number" },
  health: { label: "Health & Supplements", license: "FSSAI / AYUSH / Drug License", pattern: /^[A-Za-z0-9/-]{6,25}$/, hint: "License number (6–25 characters)" },
};

// ---------- Templates: the listing form for each product type ----------
// attr: { k: key, l: label, o: [options] (dropdown) | t: "text" | "number" | "textarea", hint }
const A = {
  idealFor: { k: "idealFor", l: "Ideal For", o: OPT.idealFor },
  color: { k: "color", l: "Color", o: OPT.colors },
  fabric: { k: "fabric", l: "Fabric", o: OPT.fabric },
  pattern: { k: "pattern", l: "Pattern", o: OPT.pattern },
  fit: { k: "fit", l: "Fit", o: OPT.fit },
  sleeve: { k: "sleeve", l: "Sleeve", o: OPT.sleeve },
  neck: { k: "neck", l: "Neck / Collar", o: OPT.neck },
  occasion: { k: "occasion", l: "Occasion", o: OPT.occasion },
  packOf: { k: "packOf", l: "Pack of", o: OPT.packOf },
  styleCode: { k: "styleCode", l: "Style Code", t: "text", hint: "e.g. ZZ-CL-RN01 (same for all sizes)" },
  modelNumber: { k: "modelNumber", l: "Model Number", t: "text" },
  modelName: { k: "modelName", l: "Model Name", t: "text" },
  fabricCare: { k: "fabricCare", l: "Fabric Care", o: OPT.fabricCare },
  warrantyMonths: { k: "warrantyMonths", l: "Warranty (months)", t: "number" },
  shelfLife: { k: "shelfLife", l: "Shelf Life (months)", t: "number" },
  ingredients: { k: "ingredients", l: "Ingredients", t: "textarea" },
  vegNonVeg: { k: "vegNonVeg", l: "Veg / Non-Veg", o: ["Veg", "Non-Veg", "Vegan"] },
  dimensions: { k: "dimensions", l: "Dimensions (L x W x H cm)", t: "text", hint: "30 x 20 x 10" },
};

const TEMPLATES = {
  apparel_top: {
    label: "Topwear", commission: 12, gst: [5, 18], gstHint: "Apparel: 5% up to ₹2,500, 18% above (confirm the final rate with your CA)",
    hsn: ["61091000", "61099090", "61051010", "62052000", "61102000", "62019390", "62044990"],
    generic: ["Tshirts", "Shirts", "Topwear", "Sweatshirts", "Jackets", "Dresses"],
    images: { min: 1, rec: 6, ratio: [5, 6] }, sizes: "apparel",
    sizeChart: [{ k: "chest", l: "Chest (inch)" }, { k: "length", l: "Length (inch)" }, { k: "shoulder", l: "Shoulder (inch)" }],
    req: [A.idealFor, A.color, A.fabric, A.pattern, A.fit, A.sleeve, A.neck, A.occasion, A.packOf, A.styleCode],
    good: [
      { k: "printCoverage", l: "Print Coverage", o: ["None", "All Over", "Chest", "Back", "Full Front", "Placement"] },
      A.fabricCare,
      { k: "length", l: "Length", o: ["Crop", "Short", "Regular", "Long"] },
      { k: "surfaceStyling", l: "Surface Styling", o: ["None", "Applique", "Embroidery", "Pocket", "Buttons", "Zipper", "Patch Work"] },
      { k: "fabricGsm", l: "Fabric GSM", t: "number" },
      { k: "reversible", l: "Reversible", o: OPT.yesNo },
    ],
  },
  apparel_bottom: {
    label: "Bottomwear", commission: 12, gst: [5, 18], gstHint: "Apparel: 5% up to ₹2,500, 18% above (confirm with your CA)",
    hsn: ["62034200", "62046200", "61034200", "61046200", "62034990"],
    generic: ["Bottom Wear", "Jeans", "Trousers", "Track Pants", "Shorts", "Leggings"],
    images: { min: 1, rec: 5, ratio: [5, 6] }, sizes: "bottom",
    sizeChart: [{ k: "waist", l: "Waist (inch)" }, { k: "length", l: "Length (inch)" }, { k: "hip", l: "Hip (inch)" }],
    req: [A.idealFor, A.color, A.fabric, A.pattern, A.fit,
      { k: "rise", l: "Waist Rise", o: ["Low Rise", "Mid Rise", "High Rise"] },
      { k: "closure", l: "Closure", o: ["Button & Zip", "Drawstring", "Elastic", "Hook & Eye", "Button"] },
      A.occasion, A.packOf, A.styleCode],
    good: [
      { k: "stretchable", l: "Stretchable", o: OPT.yesNo },
      { k: "fade", l: "Fade", o: ["No Fade", "Light Fade", "Medium Fade", "Heavy Fade"] },
      { k: "distressed", l: "Distressed", o: ["Clean Look", "Lightly Distressed", "Heavily Distressed"] },
      { k: "pockets", l: "Number of Pockets", o: ["No Pocket", "2", "4", "5", "6+"] },
      A.fabricCare,
      { k: "length", l: "Length", o: ["Full Length", "Ankle Length", "3/4th", "Knee Length", "Short"] },
    ],
  },
  ethnic: {
    label: "Ethnic Wear", commission: 12, gst: [5, 18], gstHint: "Apparel: 5% up to ₹2,500, 18% above (confirm with your CA)",
    hsn: ["62114290", "62043990", "52085290", "54075290", "61149090"],
    generic: ["Ethnic Wear", "Kurta", "Saree", "Lehenga", "Dupatta"],
    images: { min: 1, rec: 6, ratio: [5, 6] }, sizes: "ethnic",
    sizeChart: [{ k: "bust", l: "Bust/Chest (inch)" }, { k: "length", l: "Length (inch)" }, { k: "waist", l: "Waist (inch)" }],
    req: [A.idealFor, A.color, A.fabric, A.pattern,
      { k: "type", l: "Type", o: ["Kurta", "Kurta Set", "Kurti", "Saree", "Lehenga Choli", "Dupatta", "Sherwani", "Salwar Suit"] },
      { k: "stitchType", l: "Stitch Type", o: ["Stitched", "Semi-Stitched", "Unstitched"] },
      A.sleeve, A.occasion, A.packOf, A.styleCode],
    good: [A.neck,
      { k: "length", l: "Length", o: ["Short", "Knee Length", "Calf Length", "Ankle Length", "Floor Length"] },
      { k: "ornamentation", l: "Ornamentation", o: ["None", "Embroidery", "Zari", "Sequins", "Mirror Work", "Gota Patti", "Thread Work", "Stone Work"] },
      { k: "blouse", l: "Blouse", o: ["With Blouse Piece", "Without Blouse", "Stitched Blouse", "N/A"] },
      { k: "dupatta", l: "Dupatta", o: ["With Dupatta", "Without Dupatta", "N/A"] },
      A.fabricCare],
  },
  innerwear: {
    label: "Innerwear & Sleepwear", commission: 13, gst: [5, 18], gstHint: "Apparel: 5% up to ₹2,500, 18% above (confirm with your CA)",
    hsn: ["61071100", "61091000", "62121000", "61083100", "61072100"],
    generic: ["Undergarment", "Innerwear", "Sleepwear"],
    images: { min: 1, rec: 4, ratio: [5, 6] }, sizes: "apparel",
    sizeChart: [{ k: "waist", l: "Waist (inch)" }, { k: "length", l: "Length (inch)" }],
    req: [A.idealFor, A.color, A.fabric, A.pattern,
      { k: "type", l: "Type", o: ["Brief", "Trunk", "Boxer", "Vest", "Bra", "Panty", "Night Suit", "Pyjama", "Camisole", "Thermal"] },
      A.packOf, A.styleCode],
    good: [
      { k: "waistband", l: "Waistband", o: ["Exposed Elastic", "Concealed Elastic", "N/A"] },
      { k: "padding", l: "Padding", o: ["Padded", "Non Padded", "N/A"] },
      { k: "rise", l: "Rise", o: ["Low Rise", "Mid Rise", "High Rise", "N/A"] },
      A.fabricCare],
  },
  footwear: {
    label: "Footwear", commission: 13, gst: [5, 18], gstHint: "Footwear: 5% up to ₹2,500, 18% above (confirm with your CA)",
    hsn: ["64041190", "64029990", "64035119", "64051000", "64022000"],
    generic: ["Footwear", "Shoes", "Sandals", "Slippers"],
    images: { min: 1, rec: 6, ratio: [5, 6] }, sizes: "footwear",
    sizeChart: [{ k: "footLength", l: "Foot Length (cm)" }],
    req: [A.idealFor, A.color,
      { k: "outerMaterial", l: "Outer Material", o: ["Mesh", "Synthetic", "Synthetic Leather", "Genuine Leather", "PU", "Canvas", "Suede", "Rubber", "EVA", "Fabric", "Knit"] },
      { k: "soleMaterial", l: "Sole Material", o: ["Rubber", "EVA", "PU", "TPR", "Phylon", "PVC", "Leather"] },
      { k: "type", l: "Type", o: ["Running Shoes", "Walking Shoes", "Sneakers", "Casual Shoes", "Formal Shoes", "Loafers", "Boots", "Sandals", "Floaters", "Flip Flops", "Slippers", "Heels", "Flats"] },
      { k: "occasion", l: "Occasion", o: ["Sports", "Casual", "Formal", "Party", "Ethnic"] },
      { k: "closure", l: "Closure", o: ["Lace-Ups", "Slip-On", "Velcro", "Buckle", "Zip"] },
      A.styleCode],
    good: [
      { k: "heelHeight", l: "Heel Height", o: ["Flat", "Low (1-3 cm)", "Mid (3-6 cm)", "High (6+ cm)"] },
      { k: "toeShape", l: "Toe Shape", o: ["Round", "Pointed", "Square", "Open Toe"] },
      { k: "insole", l: "Insole", o: ["Memory Foam", "EVA", "Cushioned", "Regular"] },
      { k: "waterproof", l: "Waterproof", o: OPT.yesNo },
      { k: "weightG", l: "Weight per shoe (g)", t: "number" }],
  },
  bags: {
    label: "Bags & Wallets", commission: 10, gst: [18, 5], gstHint: "Leather / synthetic bags are mostly 18% (confirm with your CA)",
    hsn: ["42029200", "42022210", "42023120", "42021290"],
    generic: ["Bags", "Wallets", "Luggage"],
    images: { min: 1, rec: 6, ratio: [5, 6] }, sizes: null,
    req: [A.idealFor, A.color,
      { k: "material", l: "Material", o: ["Polyester", "Nylon", "Canvas", "PU", "Genuine Leather", "Faux Leather", "Jute", "Cotton", "Polycarbonate", "ABS"] },
      { k: "type", l: "Type", o: ["Backpack", "Handbag", "Sling Bag", "Tote", "Clutch", "Wallet", "Laptop Bag", "Duffel", "Trolley Bag", "Pouch"] },
      { k: "compartments", l: "No. of Compartments", o: ["1", "2", "3", "4", "5+"] },
      A.styleCode],
    good: [
      { k: "capacityL", l: "Capacity (Litres)", t: "number" },
      { k: "laptopSleeve", l: "Laptop Sleeve", o: ["No", "Up to 14 inch", "Up to 15.6 inch", "Up to 17 inch"] },
      { k: "waterResistant", l: "Water Resistant", o: OPT.yesNo },
      { k: "closure", l: "Closure", o: ["Zip", "Magnetic", "Button", "Drawstring", "Flap"] },
      A.dimensions],
  },
  watches: {
    label: "Watches", commission: 10, gst: [18], gstHint: "Watches: 18% (confirm with your CA)",
    hsn: ["91021100", "91021200", "91021900"], generic: ["Watches"],
    images: { min: 1, rec: 6, ratio: [5, 6] }, sizes: null,
    req: [A.idealFor,
      { k: "display", l: "Display", o: ["Analog", "Digital", "Analog-Digital"] },
      { k: "dialColor", l: "Dial Color", o: OPT.colors },
      { k: "dialShape", l: "Dial Shape", o: ["Round", "Square", "Rectangle", "Oval", "Tonneau"] },
      { k: "strapMaterial", l: "Strap Material", o: ["Leather", "Stainless Steel", "Silicone", "Fabric", "Metal", "Plastic"] },
      { k: "strapColor", l: "Strap Color", o: OPT.colors },
      { k: "movement", l: "Movement", o: ["Quartz", "Automatic", "Mechanical", "Digital"] },
      A.warrantyMonths, A.modelNumber],
    good: [
      { k: "waterResistance", l: "Water Resistance", o: ["Not Water Resistant", "30 m", "50 m", "100 m", "200 m"] },
      { k: "features", l: "Features", o: ["Date Display", "Day & Date", "Chronograph", "Luminous Hands", "Alarm", "Stopwatch"] },
      { k: "caseDiameter", l: "Case Diameter (mm)", t: "number" }, A.occasion],
  },
  jewellery: {
    label: "Fashion Jewellery", commission: 12, gst: [3], gstHint: "Imitation / fashion jewellery (HSN 7117): 3% (confirm with your CA)",
    hsn: ["71171910", "71171920", "71179010", "71131190"], generic: ["Jewellery", "Fashion Jewellery"],
    images: { min: 1, rec: 5, ratio: [5, 6] }, sizes: null,
    req: [A.idealFor,
      { k: "baseMetal", l: "Base Metal", o: ["Alloy", "Brass", "Copper", "Sterling Silver", "Stainless Steel", "Oxidised Silver", "German Silver"] },
      { k: "plating", l: "Plating", o: ["Gold-plated", "Rhodium-plated", "Silver-plated", "Rose Gold-plated", "Oxidised", "No Plating"] },
      { k: "stoneType", l: "Stone Type", o: ["None", "American Diamond", "Kundan", "Pearl", "Crystal", "Cubic Zirconia", "Beads", "Polki", "Meenakari"] },
      { k: "type", l: "Type", o: ["Earrings", "Necklace", "Jewellery Set", "Bangles", "Bracelet", "Ring", "Anklet", "Maang Tikka", "Nose Pin", "Mangalsutra", "Pendant"] },
      { k: "occasion", l: "Occasion", o: ["Everyday", "Party", "Wedding", "Festive", "Ethnic", "Office"] },
      A.color, A.packOf],
    good: [
      { k: "collection", l: "Collection", o: ["Traditional", "Contemporary", "Fusion", "Minimal", "Statement"] },
      { k: "sizing", l: "Sizing", o: ["Adjustable", "Free Size", "Fixed"] },
      { k: "weightG", l: "Net Weight (g)", t: "number" }],
  },
  fashion_acc: {
    label: "Fashion Accessories", commission: 12, gst: [18, 5], gstHint: "Depends on the item (confirm with your CA)",
    hsn: ["90041000", "42033000", "65050090", "61151030", "62171010"], generic: ["Accessories"],
    images: { min: 1, rec: 5, ratio: [5, 6] }, sizes: null,
    req: [A.idealFor, A.color,
      { k: "material", l: "Material", o: ["Metal", "Plastic", "Acetate", "Polycarbonate", "Genuine Leather", "Faux Leather", "Cotton", "Polyester", "Wool", "Nylon", "Canvas"] },
      { k: "type", l: "Type", o: ["Sunglasses", "Spectacle Frame", "Belt", "Cap", "Hat", "Scarf", "Stole", "Gloves", "Socks", "Tie"] },
      A.packOf, A.styleCode],
    good: [A.pattern,
      { k: "lensFeature", l: "Lens Feature", o: ["N/A", "UV Protection", "Polarized", "Mirrored", "Gradient"] },
      { k: "frameShape", l: "Frame Shape", o: ["N/A", "Aviator", "Wayfarer", "Round", "Rectangle", "Cat-eye", "Square", "Sports"] },
      { k: "closure", l: "Closure / Buckle", o: ["N/A", "Pin Buckle", "Auto-lock", "Snapback", "Velcro"] }],
  },
  electronics: {
    label: "Electronics", commission: 7, gst: [18], gstHint: "Electronics: mostly 18% (confirm with your CA)",
    hsn: ["85183000", "85182200", "85176290", "85176100", "84716060", "84718000", "90189099", "84231000"],
    generic: ["Electronics", "Headphones", "Speakers", "Smart Wearables", "Computer Accessories", "Health Device"],
    images: { min: 1, rec: 4, ratio: null }, sizes: null,
    req: [A.modelName, A.modelNumber, A.color,
      { k: "connectivity", l: "Connectivity", o: ["Bluetooth", "Wired", "Wi-Fi", "USB", "Bluetooth + Wired", "None"] },
      { k: "powerSource", l: "Power Source", o: ["Battery", "Rechargeable Battery", "USB", "AC Adapter", "Not Applicable"] },
      A.warrantyMonths,
      { k: "warrantySummary", l: "Warranty Summary", t: "text", hint: "1 Year Manufacturer Warranty" },
      { k: "salesPackage", l: "Items Included (Sales Package)", t: "text", hint: "Earbuds, Charging Case, USB Cable, Manual" }],
    good: [
      { k: "batteryLife", l: "Battery Life (hours)", t: "number" },
      { k: "chargingTime", l: "Charging Time (min)", t: "number" },
      { k: "bluetoothVersion", l: "Bluetooth Version", o: ["N/A", "4.2", "5.0", "5.1", "5.2", "5.3", "5.4"] },
      { k: "waterResistance", l: "Water Resistance", o: ["None", "IPX4", "IPX5", "IPX7", "IP67", "IP68"] },
      { k: "noiseCancellation", l: "Noise Cancellation", o: ["None", "ENC", "ANC", "ANC + ENC"] },
      { k: "notCovered", l: "Not Covered in Warranty", t: "text", hint: "Physical / water damage" }],
  },
  mobile_acc: {
    label: "Mobile Accessories", commission: 10, gst: [18], gstHint: "18% (confirm with your CA)",
    hsn: ["39269099", "85044030", "85444299", "85076000", "70071900"], generic: ["Mobile Accessories"],
    images: { min: 1, rec: 4, ratio: null }, sizes: null,
    req: [
      { k: "compatibleModels", l: "Compatible Models", t: "text", hint: "iPhone 15, iPhone 15 Pro" },
      { k: "type", l: "Type", o: ["Back Cover", "Flip Cover", "Screen Guard", "Charger", "Data Cable", "Power Bank", "Car Charger", "Mobile Holder", "Selfie Stick"] },
      { k: "material", l: "Material", o: ["Silicone", "TPU", "Polycarbonate", "Leather", "Tempered Glass", "Plastic", "Aluminium", "Nylon Braided"] },
      A.color, A.packOf, A.modelNumber],
    good: [
      { k: "connectorType", l: "Connector Type", o: ["N/A", "USB Type-C", "Lightning", "Micro USB", "USB-A to Type-C", "Type-C to Type-C"] },
      { k: "cableLengthM", l: "Cable Length (m)", t: "number" },
      { k: "outputW", l: "Output (Watt)", t: "number" },
      { k: "capacityMah", l: "Capacity (mAh)", t: "number" }, A.warrantyMonths],
  },
  books: {
    label: "Books", commission: 5, gst: [0], gstHint: "Printed books: 0% GST",
    hsn: ["49011010", "49011020", "49019900"], generic: ["Books"],
    images: { min: 1, rec: 4, ratio: null }, sizes: null,
    req: [
      { k: "author", l: "Author", t: "text" },
      { k: "publisher", l: "Publisher", t: "text" },
      { k: "isbn", l: "ISBN-13", t: "text", hint: "978XXXXXXXXXX (13 digits)" },
      { k: "language", l: "Language", o: ["English", "Hindi", "Marathi", "Bengali", "Tamil", "Telugu", "Gujarati", "Kannada", "Malayalam", "Punjabi", "Urdu", "Sanskrit", "Bilingual"] },
      { k: "format", l: "Book Format", o: ["Paperback", "Hardcover", "Board Book", "Spiral Bound"] },
      { k: "pages", l: "Pages", t: "number" },
      { k: "publishYear", l: "Publish Year", t: "number" },
      { k: "genre", l: "Genre", o: ["Fiction", "Non-Fiction", "Children", "Exam Preparation", "Academic & Textbook", "Self-Help", "Biography", "Religion & Spirituality", "Business & Economics", "Comics", "Reference"] }],
    good: [
      { k: "edition", l: "Edition", t: "text" },
      { k: "readingAge", l: "Reading Age", o: ["N/A", "0-3", "3-6", "6-9", "9-12", "12+", "Adult"] },
      { k: "subGenre", l: "Sub Genre", t: "text" }],
  },
  stationery: {
    label: "Stationery", commission: 8, gst: [0, 5, 18], gstHint: "Depends on the item (notebooks / pens differ) — confirm with your CA",
    hsn: ["48202000", "96081019", "96091000", "48201010", "95030090"], generic: ["Stationery"],
    images: { min: 1, rec: 4, ratio: null }, sizes: null,
    req: [
      { k: "type", l: "Type", o: ["Notebook", "Diary", "Pen", "Pencil", "Marker", "Highlighter", "Colour Pencils", "Paint", "Sketch Book", "Geometry Box", "File / Folder", "Sticky Notes"] },
      A.color, A.packOf,
      { k: "material", l: "Material", o: ["Paper", "Plastic", "Metal", "Wood", "Cardboard", "Fabric"] },
      A.modelNumber],
    good: [
      { k: "pages", l: "No. of Pages / Sheets", t: "number" },
      { k: "ruling", l: "Ruling", o: ["N/A", "Ruled", "Unruled", "Square", "Dotted"] },
      { k: "paperSize", l: "Paper Size", o: ["N/A", "A4", "A5", "B5", "Pocket", "Long Book"] },
      { k: "inkColor", l: "Ink Color", o: ["N/A", "Blue", "Black", "Red", "Green", "Multicolor"] }],
  },
  beauty: {
    label: "Beauty & Personal Care", commission: 8, gst: [5, 18], gstHint: "5% or 18% depending on the product — confirm with your CA",
    hsn: ["33049910", "33049990", "33051090", "33030010", "33079090", "34013019", "33059011"],
    generic: ["Personal Care", "Cosmetics", "Hair Care", "Skin Care", "Fragrance"],
    images: { min: 1, rec: 5, ratio: null }, sizes: null,
    req: [
      { k: "quantity", l: "Quantity", t: "number" },
      { k: "unit", l: "Quantity Unit", o: ["ml", "g", "Units"] },
      { k: "idealFor", l: "Ideal For", o: ["Men", "Women", "Unisex", "Kids"] },
      { k: "form", l: "Form", o: ["Cream", "Gel", "Liquid", "Oil", "Lotion", "Foam", "Powder", "Stick", "Spray", "Serum", "Balm"] },
      { k: "skinHairType", l: "Skin / Hair Type", o: ["All", "Normal", "Oily", "Dry", "Combination", "Sensitive", "Curly", "Straight", "N/A"] },
      { k: "concern", l: "Concern", o: ["General Care", "Acne", "Anti-ageing", "Brightening", "Dandruff", "Hair Fall", "Dryness", "Tan Removal", "Oil Control", "Fragrance", "Colour"] },
      A.shelfLife,
      { k: "ingredients", l: "Key Ingredients", t: "textarea" }],
    good: [
      { k: "fragrance", l: "Fragrance", t: "text" },
      { k: "organic", l: "Organic", o: OPT.yesNo },
      { k: "parabenFree", l: "Paraben Free", o: OPT.yesNo },
      { k: "crueltyFree", l: "Cruelty Free", o: OPT.yesNo },
      { k: "usage", l: "How to Use", t: "textarea" }],
  },
  grocery: {
    label: "Grocery & Food", commission: 5, gst: [0, 5, 18], gstHint: "0% / 5% / 18% depending on the food item — confirm with your CA",
    hsn: ["09024020", "09012190", "09109100", "08013200", "19059090", "20019000", "11010000", "10063020", "04090000"],
    generic: ["Grocery", "Tea", "Coffee", "Spices", "Snacks", "Dry Fruits", "Staples"],
    images: { min: 1, rec: 6, ratio: null }, sizes: null, restricted: "fssai",
    req: [A.vegNonVeg,
      { k: "form", l: "Form", o: ["Loose Leaf", "Powder", "Whole", "Granules", "Paste", "Liquid", "Bar", "Pieces"] },
      A.shelfLife, A.ingredients,
      { k: "containerType", l: "Container Type", o: ["Pouch", "Jar", "Box", "Bottle", "Tin", "Packet"] },
      { k: "organic", l: "Organic", o: OPT.yesNo },
      { k: "preservatives", l: "Added Preservatives", o: OPT.yesNo },
      { k: "fssaiNumber", l: "FSSAI License No. (on pack)", t: "text", hint: "14 digits" }],
    good: [
      { k: "nutrition", l: "Nutrient Content (per 100 g)", t: "textarea" },
      { k: "allergens", l: "Allergen Info", t: "text" },
      { k: "storage", l: "Storage Instructions", t: "text" },
      { k: "flavour", l: "Flavour", t: "text" }],
  },
  health: {
    label: "Health & Supplements", commission: 7, gst: [5, 18], gstHint: "Depends on the product — confirm with your CA",
    hsn: ["21069099", "30049011", "21061000", "30039011"], generic: ["Health Supplement", "Ayurvedic Medicine", "Nutrition"],
    images: { min: 1, rec: 6, ratio: null }, sizes: null, restricted: "health",
    req: [
      { k: "form", l: "Form", o: ["Tablet", "Capsule", "Powder", "Liquid", "Syrup", "Gummies", "Granules", "Churna", "Oil"] },
      { k: "quantity", l: "Quantity (count / g / ml)", t: "number" },
      A.vegNonVeg, A.shelfLife,
      { k: "composition", l: "Composition / Ingredients", t: "textarea" },
      { k: "prescription", l: "Prescription Required", o: OPT.yesNo },
      { k: "licenseOnPack", l: "License No. on pack", t: "text" },
      { k: "idealFor", l: "Ideal For", o: ["Men", "Women", "Unisex", "Kids", "Senior"] }],
    good: [
      { k: "dosage", l: "Suggested Dosage", t: "textarea" },
      { k: "precautions", l: "Precautions", t: "textarea" },
      { k: "benefits", l: "Key Benefits", t: "text" },
      { k: "flavour", l: "Flavour", t: "text" }],
  },
  home_kitchen: {
    label: "Kitchen & Dining", commission: 9, gst: [5, 18], gstHint: "Depends on the material / item — confirm with your CA",
    hsn: ["73239390", "76151030", "39241090", "69120010", "70134900", "82159900", "96170019"], generic: ["Kitchen & Dining", "Cookware", "Kitchen Storage"],
    images: { min: 1, rec: 5, ratio: null }, sizes: null,
    req: [
      { k: "type", l: "Type", o: ["Cookware", "Tawa", "Kadai", "Pressure Cooker", "Water Bottle", "Flask", "Lunch Box", "Storage Container", "Dinner Set", "Plate", "Bowl", "Glass", "Mug", "Kitchen Tool", "Knife", "Chopping Board"] },
      { k: "material", l: "Material", o: ["Stainless Steel", "Aluminium", "Cast Iron", "Non-Stick Coated", "Glass", "Borosilicate Glass", "Ceramic", "Plastic", "Copper", "Wood", "Melamine", "Silicone"] },
      A.color,
      { k: "capacity", l: "Capacity / Size", t: "text", hint: "1 L / 24 cm / 6 pcs" },
      A.packOf, A.modelNumber],
    good: [
      { k: "microwaveSafe", l: "Microwave Safe", o: OPT.yesNo },
      { k: "dishwasherSafe", l: "Dishwasher Safe", o: OPT.yesNo },
      { k: "inductionBase", l: "Induction Base", o: OPT.yesNo },
      { k: "bpaFree", l: "BPA Free", o: OPT.yesNo }, A.warrantyMonths, A.dimensions],
  },
  home_furnishing: {
    label: "Home Furnishing", commission: 9, gst: [5, 18], gstHint: "Textile: 5% up to ₹2,500, 18% above (confirm with your CA)",
    hsn: ["63022100", "63039200", "63049260", "63026000", "57050049", "63014000"], generic: ["Home Furnishing", "Bed Linen", "Curtains", "Towels"],
    images: { min: 1, rec: 5, ratio: null }, sizes: null,
    req: [
      { k: "type", l: "Type", o: ["Bedsheet", "Bedding Set", "Comforter", "Blanket", "Curtain", "Cushion Cover", "Towel", "Carpet", "Doormat", "Table Cover", "Pillow"] },
      { k: "material", l: "Material", o: ["Cotton", "Pure Cotton", "Polyester", "Microfiber", "Polycotton", "Silk", "Velvet", "Jute", "Wool", "Terry Cotton"] },
      A.color,
      { k: "size", l: "Size", o: ["Single", "Double", "Queen", "King", "Standard", "5 ft", "7 ft", "9 ft", "Free Size"] },
      A.pattern,
      { k: "packOf", l: "Number of Items", o: OPT.packOf }],
    good: [
      { k: "threadCount", l: "Thread Count", t: "number" },
      { k: "gsm", l: "GSM", t: "number" }, A.dimensions, A.fabricCare,
      { k: "roomType", l: "Room Type", o: ["Bedroom", "Living Room", "Kids Room", "Kitchen", "Bathroom"] }],
  },
  home_decor: {
    label: "Home Decor", commission: 10, gst: [5, 18], gstHint: "Depends on the item — confirm with your CA",
    hsn: ["91052100", "44201000", "83062990", "94051000", "67029090", "70139900", "44140000"], generic: ["Home Decor"],
    images: { min: 1, rec: 5, ratio: null }, sizes: null,
    req: [
      { k: "type", l: "Type", o: ["Wall Clock", "Table Clock", "Showpiece", "Idol", "Wall Art", "Painting", "Photo Frame", "Lamp", "String Lights", "Artificial Plant", "Vase", "Candle", "Wall Shelf"] },
      { k: "material", l: "Material", o: ["Wood", "MDF", "Metal", "Plastic", "Glass", "Ceramic", "Resin", "Polyresin", "Brass", "Paper", "Fabric"] },
      A.color, A.modelNumber, A.packOf],
    good: [A.dimensions,
      { k: "theme", l: "Theme", o: ["Modern", "Traditional", "Religious", "Floral", "Abstract", "Vintage", "Kids"] },
      { k: "batteryOperated", l: "Battery Operated", o: OPT.yesNo },
      { k: "mountType", l: "Mount Type", o: ["N/A", "Wall Mount", "Tabletop", "Hanging", "Floor Standing"] }],
  },
  furniture: {
    label: "Furniture", commission: 10, gst: [18], gstHint: "Furniture: 18% (confirm with your CA)",
    hsn: ["94013000", "94036000", "94038900", "94017100", "94042990"], generic: ["Furniture"],
    images: { min: 1, rec: 6, ratio: null }, sizes: null,
    req: [
      { k: "type", l: "Type", o: ["Chair", "Office Chair", "Table", "Study Table", "Coffee Table", "Shelf", "Rack", "Bean Bag", "Stool", "Sofa", "Bed", "Wardrobe"] },
      { k: "primaryMaterial", l: "Primary Material", o: ["Engineered Wood", "Solid Wood", "Metal", "Plastic", "Fabric", "Leatherette", "Cane", "Glass"] },
      { k: "finishColor", l: "Finish Color", o: OPT.colors },
      { k: "assembly", l: "Delivery Condition", o: ["DIY (Do-It-Yourself)", "Carpenter Assembly", "Pre-Assembled"] },
      A.dimensions, A.warrantyMonths],
    good: [
      { k: "weightCapacity", l: "Max Load Capacity (kg)", t: "number" },
      { k: "storage", l: "Storage Included", o: OPT.yesNo },
      { k: "finishType", l: "Finish Type", o: ["Matte", "Glossy", "Laminated", "Polished", "Powder Coated", "Natural"] },
      { k: "care", l: "Care Instructions", t: "text" }],
  },
  toys: {
    label: "Toys & Games", commission: 9, gst: [5, 18], gstHint: "Toys: depends on the product — confirm with your CA",
    hsn: ["95030010", "95030030", "95030090", "95049090"], generic: ["Toys"],
    images: { min: 1, rec: 5, ratio: null }, sizes: null,
    req: [
      { k: "minAge", l: "Minimum Age", o: ["0+ months", "6+ months", "1+ years", "2+ years", "3+ years", "5+ years", "8+ years", "12+ years", "14+ years"] },
      { k: "type", l: "Type", o: ["Soft Toy", "Educational Toy", "Remote Control Toy", "Puzzle", "Board Game", "Building Blocks", "Action Figure", "Doll", "Musical Toy", "Ride-on", "Outdoor Toy"] },
      { k: "material", l: "Material", o: ["Plastic", "Polyester / Plush", "Wood", "Cardboard", "Metal", "Fabric", "Foam"] },
      { k: "batteryOperated", l: "Battery Operated", o: OPT.yesNo },
      A.color,
      { k: "bisNumber", l: "BIS License (CM/L) No.", t: "text", hint: "CM/L-1234567890 (BIS is mandatory for toys)" },
      A.packOf],
    good: [
      { k: "maxAge", l: "Maximum Age", t: "text" },
      { k: "character", l: "Character", t: "text" },
      { k: "pieces", l: "Number of Pieces", t: "number" },
      { k: "salesPackage", l: "Items Included", t: "text" }],
  },
  baby_care: {
    label: "Baby Care", commission: 8, gst: [5, 18], gstHint: "Depends on the product — confirm with your CA",
    hsn: ["96190010", "34011190", "39241090", "33049990"], generic: ["Baby Care"],
    images: { min: 1, rec: 5, ratio: null }, sizes: null,
    req: [
      { k: "type", l: "Type", o: ["Diapers", "Baby Wipes", "Feeding Bottle", "Baby Lotion", "Baby Shampoo", "Baby Oil", "Baby Powder", "Bib", "Sipper"] },
      { k: "minAge", l: "Minimum Age", o: ["0+ months", "3+ months", "6+ months", "12+ months", "18+ months"] },
      { k: "quantity", l: "Count / Quantity", t: "number" },
      { k: "material", l: "Material", o: ["Cotton", "Polypropylene (BPA Free)", "Silicone", "Cloth", "N/A"] },
      A.shelfLife,
      { k: "idealFor", l: "Ideal For", o: ["Baby Boys", "Baby Girls", "Unisex"] }],
    good: [
      { k: "bpaFree", l: "BPA Free", o: OPT.yesNo },
      { k: "fragranceFree", l: "Fragrance Free", o: OPT.yesNo },
      { k: "diaperSize", l: "Diaper Size", o: ["N/A", "NB", "S", "M", "L", "XL"] },
      { k: "dermaTested", l: "Dermatologically Tested", o: OPT.yesNo }],
  },
  sports: {
    label: "Sports & Fitness", commission: 9, gst: [5, 18], gstHint: "Sports goods: depends on the product — confirm with your CA",
    hsn: ["95069990", "95066210", "95069110", "95065190", "95063900", "87120010"], generic: ["Sports Equipment", "Fitness"],
    images: { min: 1, rec: 5, ratio: null }, sizes: null,
    req: [
      { k: "sportType", l: "Sport Type", o: ["Cricket", "Football", "Badminton", "Tennis", "Yoga", "Gym & Fitness", "Running", "Cycling", "Basketball", "Volleyball", "Table Tennis", "Swimming"] },
      { k: "type", l: "Product Type", t: "text", hint: "Bat / Ball / Mat / Dumbbell" },
      { k: "material", l: "Material", o: ["Kashmir Willow", "English Willow", "Rubber", "PVC", "TPE", "NBR", "Leather", "Synthetic", "Aluminium", "Carbon Fibre", "Steel", "Nylon", "Plastic"] },
      A.color,
      { k: "idealFor", l: "Ideal For", o: ["Men", "Women", "Unisex", "Boys", "Girls", "Kids"] },
      A.packOf],
    good: [
      { k: "size", l: "Size / Dimension", t: "text" },
      { k: "weightG", l: "Weight (g)", t: "number" },
      { k: "skillLevel", l: "Skill Level", o: ["Beginner", "Intermediate", "Professional"] },
      { k: "salesPackage", l: "Items Included", t: "text" }],
  },
};

// ---------- Category tree: super category → category → verticals ----------
// Super category names match the storefront CATEGORIES (products.js)
const TAXONOMY = [
  { name: "Fashion", cats: [
    { name: "Men Top Wear", t: "apparel_top", ideal: "Men", v: ["T-Shirts", "Shirts", "Polos", "Sweatshirts & Hoodies", "Jackets"] },
    { name: "Men Bottom Wear", t: "apparel_bottom", ideal: "Men", v: ["Jeans", "Trousers", "Track Pants", "Shorts", "Cargos"] },
    { name: "Women Western Wear", t: "apparel_top", ideal: "Women", v: ["Tops", "T-Shirts", "Shirts", "Dresses", "Sweatshirts"] },
    { name: "Women Bottom Wear", t: "apparel_bottom", ideal: "Women", sizes: "apparel", v: ["Jeans", "Leggings", "Palazzos", "Skirts", "Trousers"] },
    { name: "Ethnic Wear", t: "ethnic", v: ["Kurtas", "Kurta Sets", "Kurtis", "Sarees", "Lehenga Cholis", "Dupattas", "Sherwanis"] },
    { name: "Innerwear & Sleepwear", t: "innerwear", v: ["Briefs & Trunks", "Vests", "Bras", "Night Suits", "Boxers"] },
    { name: "Kids Wear", t: "apparel_top", sizes: "kids", v: ["Boys T-Shirts", "Girls Dresses", "Kids Clothing Sets", "Kids Ethnic Wear"] },
    { name: "Footwear", t: "footwear", v: ["Sports Shoes", "Casual Shoes", "Formal Shoes", "Sandals & Floaters", "Flip Flops & Slippers", "Heels & Flats"] },
  ] },
  { name: "Accessories", cats: [
    { name: "Bags & Luggage", t: "bags", v: ["Backpacks", "Handbags", "Wallets", "Laptop Bags", "Trolley Bags", "Sling Bags"] },
    { name: "Watches", t: "watches", v: ["Analog Watches", "Digital Watches", "Couple Watches"] },
    { name: "Jewellery", t: "jewellery", v: ["Earrings", "Necklaces & Sets", "Bangles & Bracelets", "Rings", "Anklets", "Mangalsutras"] },
    { name: "Eyewear, Belts & Caps", t: "fashion_acc", v: ["Sunglasses", "Spectacle Frames", "Belts", "Caps & Hats", "Socks", "Ties"] },
  ] },
  { name: "Electronics", cats: [
    { name: "Audio", t: "electronics", v: ["Headphones", "True Wireless Earbuds", "Bluetooth Speakers", "Soundbars", "Neckbands"] },
    { name: "Wearables", t: "electronics", v: ["Smart Watches", "Fitness Bands"] },
    { name: "Mobile Accessories", t: "mobile_acc", v: ["Mobile Cases & Covers", "Chargers & Adapters", "Data Cables", "Power Banks", "Screen Guards", "Mobile Holders"] },
    { name: "Computer Accessories", t: "electronics", v: ["Mouse", "Keyboards", "Pen Drives", "Webcams", "Laptop Stands"] },
  ] },
  { name: "Home", cats: [
    { name: "Kitchen & Dining", t: "home_kitchen", v: ["Cookware", "Water Bottles & Flasks", "Lunch Boxes", "Storage Containers", "Dinnerware", "Kitchen Tools"] },
    { name: "Home Furnishing", t: "home_furnishing", v: ["Bedsheets", "Curtains", "Cushion Covers", "Towels", "Carpets & Rugs", "Blankets"] },
    { name: "Home Decor", t: "home_decor", v: ["Wall Clocks", "Showpieces & Idols", "Wall Decor", "Lamps & Lights", "Artificial Plants", "Photo Frames"] },
    { name: "Furniture", t: "furniture", v: ["Chairs", "Tables", "Shelves & Racks", "Bean Bags", "Stools"] },
  ] },
  { name: "Beauty", cats: [
    { name: "Skin Care", t: "beauty", v: ["Face Wash", "Moisturizers", "Sunscreen", "Face Serum", "Face Pack"] },
    { name: "Makeup", t: "beauty", v: ["Lipstick", "Kajal & Eyeliner", "Foundation", "Nail Polish", "Compact"] },
    { name: "Hair Care", t: "beauty", v: ["Shampoo", "Hair Oil", "Conditioner", "Hair Color"] },
    { name: "Fragrances", t: "beauty", v: ["Perfumes", "Deodorants", "Attar"] },
    { name: "Men's Grooming", t: "beauty", v: ["Beard Oil", "Shaving Cream", "Face Wash for Men", "Hair Wax & Gel"] },
  ] },
  { name: "Grocery", cats: [
    { name: "Beverages", t: "grocery", v: ["Tea", "Coffee", "Health Drinks"] },
    { name: "Staples", t: "grocery", v: ["Atta & Flours", "Rice", "Dals & Pulses", "Edible Oils", "Ghee"] },
    { name: "Spices & Masalas", t: "grocery", v: ["Whole Spices", "Powdered Spices", "Blended Masalas"] },
    { name: "Snacks & Sweets", t: "grocery", v: ["Namkeen", "Chips", "Biscuits & Cookies", "Chocolates", "Indian Sweets"] },
    { name: "Dry Fruits & Nuts", t: "grocery", v: ["Almonds", "Cashews", "Raisins", "Mixed Dry Fruits"] },
    { name: "Pickles & Spreads", t: "grocery", v: ["Pickles", "Honey", "Jams & Spreads"] },
  ] },
  { name: "Health", cats: [
    { name: "Vitamins & Supplements", t: "health", v: ["Multivitamins", "Protein Supplements", "Omega 3", "Biotin"] },
    { name: "Ayurveda", t: "health", v: ["Ayurvedic Tablets", "Chyawanprash", "Herbal Juices"] },
    { name: "Health Devices", t: "electronics", v: ["BP Monitors", "Thermometers", "Pulse Oximeters", "Weighing Scales"] },
  ] },
  { name: "Toys", cats: [
    { name: "Toys & Games", t: "toys", v: ["Soft Toys", "Educational Toys", "Remote Control Toys", "Puzzles", "Board Games", "Building Blocks"] },
    { name: "Baby Care", t: "baby_care", v: ["Diapers", "Baby Wipes", "Feeding Bottles", "Baby Skin & Hair Care"] },
  ] },
  { name: "Sports", cats: [
    { name: "Cricket", t: "sports", v: ["Cricket Bats", "Cricket Balls", "Cricket Kits"] },
    { name: "Fitness", t: "sports", v: ["Yoga Mats", "Dumbbells", "Resistance Bands", "Skipping Ropes", "Gym Gloves"] },
    { name: "Racquet Sports", t: "sports", v: ["Badminton Rackets", "Shuttlecocks", "Tennis Rackets"] },
    { name: "Football & Others", t: "sports", v: ["Footballs", "Basketballs", "Volleyballs"] },
    { name: "Cycling", t: "sports", v: ["Cycles", "Cycle Accessories"] },
  ] },
  { name: "Books", cats: [
    { name: "Books", t: "books", v: ["Fiction", "Non-Fiction", "Children's Books", "Exam Preparation", "Academic Textbooks", "Comics"] },
    { name: "Stationery", t: "stationery", v: ["Notebooks & Diaries", "Pens & Pencils", "Art Supplies", "Office Supplies"] },
  ] },
];

const slugify = (s) => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Flat vertical list: { id, name, cat, superCat, template, ideal, sizes }
const VERTICALS = [];
TAXONOMY.forEach((sup) => sup.cats.forEach((c) => c.v.forEach((v) => {
  VERTICALS.push({
    id: slugify(`${c.name}-${v}`), name: v, cat: c.name, superCat: sup.name,
    template: c.t, ideal: c.ideal || "", sizes: c.sizes || TEMPLATES[c.t].sizes,
  });
})));
const getVertical = (id) => VERTICALS.find((v) => v.id === id) || null;
const templateOf = (vertical) => (vertical ? TEMPLATES[vertical.template] : null);
const sizesOf = (vertical) => (vertical && vertical.sizes ? SIZE_SETS[vertical.sizes] : null);

function searchVerticals(q) {
  const words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return VERTICALS.filter((v) => {
    const hay = `${v.name} ${v.cat} ${v.superCat} ${TEMPLATES[v.template].label}`.toLowerCase();
    return words.every((w) => hay.includes(w) || hay.includes(w.replace(/s$/, "")));
  }).slice(0, 25);
}

// =====================================================================
// Fees — Zzapkart demo fee schedule (Section 9: "work out profit from the settlement amount")
// =====================================================================
const FEE_RULES = {
  fixed: [[300, 10], [500, 15], [1000, 25], [Infinity, 40]], // price slab → closing fee
  shippingFirst500g: 40, shippingPer500g: 20,                  // national average
  collectionPct: 2, gstOnFeesPct: 18,
};
const r2 = (n) => Math.round(n * 100) / 100;

function shippingWeightKg(pkg) {
  const dead = (Number(pkg && pkg.w) || 500) / 1000;
  const vol = pkg && pkg.l && pkg.b && pkg.h ? (pkg.l * pkg.b * pkg.h) / 5000 : 0;
  return Math.max(dead, vol);
}

function feeBreakdown(price, tpl, pkg) {
  price = Number(price) || 0;
  const commissionPct = tpl ? tpl.commission : 10;
  const commission = r2((price * commissionPct) / 100);
  const fixed = FEE_RULES.fixed.find(([max]) => price <= max)[1];
  const kg = shippingWeightKg(pkg);
  const slabs = Math.max(1, Math.ceil(kg / 0.5));
  const shipping = FEE_RULES.shippingFirst500g + (slabs - 1) * FEE_RULES.shippingPer500g;
  const collection = r2((price * FEE_RULES.collectionPct) / 100);
  const fees = r2(commission + fixed + shipping + collection);
  const gst = r2((fees * FEE_RULES.gstOnFeesPct) / 100);
  const total = r2(fees + gst);
  return { price, commissionPct, commission, fixed, shipping, shipKg: r2(kg), collection, gst, total, settlement: r2(price - total) };
}

// =====================================================================
// Validation — Section 7 (compulsory), 8 (images), 9 (price/tax), 15 (tips)
// =====================================================================
const PINCODE_RE = /^[1-9]\d{5}$/;
const HSN_RE = /^\d{4}(\d{2}){0,2}$/;

// ---------------------------------------------------------------------
// HSN directory: shows what a code means in the listing form and powers
// "Find an HSN code". A guide only — confirm the final code with a CA / the GST portal.
// ---------------------------------------------------------------------
const HSN_HEADINGS = {
  "0409": "Natural honey", "0801": "Coconuts, cashew & brazil nuts", "0901": "Coffee", "0902": "Tea", "0910": "Ginger, turmeric & other spices / masala mixes",
  "1006": "Rice", "1101": "Wheat or meslin flour (atta)", "1905": "Bread, biscuits, cakes & other bakery products", "2001": "Vegetables & fruits preserved in vinegar (pickles)",
  "2106": "Food preparations n.e.s. (supplements, protein mixes)", "3003": "Medicaments, not in measured doses (incl. Ayurvedic)", "3004": "Medicaments in measured doses / retail packs (incl. Ayurvedic)",
  "3303": "Perfumes & toilet waters", "3304": "Beauty, make-up & skin-care preparations", "3305": "Hair preparations (shampoo, hair oil)", "3307": "Shaving, deodorants, bath & other toilet preparations",
  "3401": "Soap & skin-washing preparations", "3924": "Tableware, kitchenware & household articles of plastic", "3926": "Other articles of plastic (e.g., phone covers)",
  "4202": "Trunks, suitcases, handbags, wallets, backpacks & similar", "4203": "Articles of apparel & accessories of leather (belts)", "4414": "Wooden frames for paintings, photos & mirrors",
  "4420": "Wooden statuettes, ornaments & caskets", "4820": "Registers, notebooks, diaries & similar stationery", "4901": "Printed books, brochures & leaflets",
  "5208": "Woven fabrics of cotton", "5407": "Woven fabrics of synthetic filament yarn", "5705": "Other carpets & textile floor coverings (rugs, mats)",
  "6103": "Men's suits, trousers & shorts — knitted", "6104": "Women's suits, dresses, trousers & shorts — knitted", "6105": "Men's shirts — knitted",
  "6107": "Men's underpants, briefs, nightshirts & pyjamas — knitted", "6108": "Women's slips, panties, nightdresses & pyjamas — knitted",
  "6109": "T-shirts, singlets & vests — knitted", "6110": "Jerseys, pullovers, sweatshirts & cardigans — knitted", "6114": "Other garments — knitted",
  "6115": "Socks, stockings & hosiery — knitted", "6201": "Men's overcoats, jackets & windcheaters — woven", "6203": "Men's suits, trousers, jeans & shorts — woven",
  "6204": "Women's suits, dresses, skirts, trousers & jeans — woven", "6205": "Men's shirts — woven", "6211": "Other garments (kurtas, track suits etc.) — woven",
  "6212": "Brassieres, girdles & similar", "6217": "Other made-up clothing accessories", "6301": "Blankets & travelling rugs", "6302": "Bed linen, table linen, toilet & kitchen linen (towels)",
  "6303": "Curtains, drapes & blinds", "6304": "Other furnishing articles (cushion covers, bedspreads)", "6402": "Other footwear — rubber / plastic soles & uppers",
  "6403": "Footwear with leather uppers", "6404": "Footwear with textile uppers (sports shoes, canvas shoes)", "6405": "Other footwear", "6505": "Hats & caps",
  "6702": "Artificial flowers, foliage & fruit", "6912": "Ceramic tableware & kitchenware", "7007": "Safety glass (toughened / laminated) — incl. screen guards",
  "7013": "Glassware for table, kitchen & decoration", "7113": "Jewellery of precious metal (silver, gold)", "7117": "Imitation jewellery",
  "7323": "Table, kitchen & household articles of iron / steel", "7615": "Table, kitchen & household articles of aluminium", "8215": "Spoons, forks, ladles & similar kitchenware",
  "8306": "Bells, statuettes, photo frames & ornaments of base metal", "8423": "Weighing machines (incl. personal / kitchen scales)",
  "8471": "Computers & units (keyboard, mouse, storage)", "8504": "Transformers, adapters & chargers", "8507": "Electric accumulators (batteries, power banks)",
  "8517": "Telephones, smartphones & data communication apparatus (smartwatches, routers)", "8518": "Microphones, loudspeakers, headphones & earphones",
  "8544": "Insulated wire & cables (charging / data cables)", "8712": "Bicycles", "9004": "Spectacles & sunglasses", "9018": "Medical & health instruments",
  "9102": "Wrist-watches (non-precious metal case)", "9105": "Other clocks (wall clocks, alarm clocks)", "9401": "Seats & chairs", "9403": "Other furniture",
  "9404": "Mattresses, quilts, cushions & pillows", "9405": "Lamps & lighting fittings", "9503": "Toys, dolls, puzzles & scale models", "9504": "Board games, table games & video game consoles",
  "9506": "Sports, gym & outdoor games equipment", "9608": "Ball-point pens & markers", "9609": "Pencils, crayons & chalks", "9617": "Vacuum flasks & bottles",
  "9619": "Sanitary pads, diapers & similar hygiene articles",
};
const HSN_INFO = {
  "61091000": "T-shirts, singlets & vests — knitted, of cotton", "61099090": "T-shirts & vests — knitted, of other textile materials",
  "61051010": "Men's shirts — knitted, of cotton", "62052000": "Men's shirts — woven, of cotton", "61102000": "Sweatshirts, pullovers & cardigans — knitted, of cotton",
  "62019390": "Men's jackets & windcheaters — of man-made fibres", "62044990": "Women's dresses — woven, of other textile materials",
  "62034200": "Men's trousers, jeans & shorts — woven, of cotton", "62046200": "Women's trousers, jeans & shorts — woven, of cotton",
  "61034200": "Men's trousers & shorts — knitted, of cotton", "61046200": "Women's trousers & shorts — knitted, of cotton",
  "62034990": "Men's trousers & shorts — woven, of other textile materials", "62114290": "Other garments (kurtas, salwar etc.) — women's, of cotton",
  "62043990": "Women's jackets & blazers — of other textile materials", "52085290": "Woven cotton fabric, printed (dress material)",
  "54075290": "Woven synthetic filament fabric, dyed (saree / dress material)", "61149090": "Other garments — knitted, of other textile materials",
  "61071100": "Men's briefs & underpants — knitted, of cotton", "62121000": "Brassieres", "61083100": "Women's nightdresses & pyjamas — knitted, of cotton",
  "61072100": "Men's nightshirts & pyjamas — knitted, of cotton", "64041190": "Sports shoes — rubber / plastic soles, textile uppers",
  "64029990": "Other footwear — rubber / plastic soles & uppers (slippers etc.)", "64035119": "Footwear — leather soles & uppers, covering the ankle",
  "64051000": "Other footwear — uppers of leather", "64022000": "Flip-flops / footwear with upper straps fixed by plugs",
  "42029200": "Bags & cases — outer surface of plastic or textile (backpacks, travel bags)", "42022210": "Handbags — outer surface of plastic sheeting",
  "42023120": "Wallets & purses — outer surface of leather", "42021290": "Suitcases, trolleys & school bags — outer surface of plastic / textile",
  "91021100": "Wrist-watches, battery operated — analog display", "91021200": "Wrist-watches, battery operated — digital display",
  "91021900": "Other battery-operated wrist-watches", "71171910": "Imitation jewellery — bangles", "71171920": "Imitation jewellery — German silver",
  "71179010": "Imitation jewellery — other materials", "71131190": "Jewellery of silver", "90041000": "Sunglasses", "42033000": "Belts — of leather",
  "65050090": "Hats & caps", "61151030": "Socks & hosiery — knitted", "62171010": "Clothing accessories (made-up)",
  "85183000": "Headphones & earphones (incl. with microphone)", "85182200": "Multiple loudspeakers in one enclosure (speakers)",
  "85176290": "Data communication apparatus — other (smartwatches, wearables, routers)", "85176100": "Base stations (communication apparatus)",
  "84716060": "Computer input units (mouse / keyboard)", "84718000": "Other computer units (e.g., webcams, card readers)",
  "90189099": "Other medical / health instruments", "84231000": "Personal weighing scales (incl. baby scales)",
  "39269099": "Other articles of plastic (phone cases & covers)", "85044030": "Chargers & power adapters", "85444299": "Cables with connectors (charging / data cables)",
  "85076000": "Lithium-ion batteries / power banks", "70071900": "Toughened safety glass (screen guards)",
  "49011010": "Printed books — single sheets", "49011020": "Pamphlets, booklets & brochures", "49019900": "Printed books — other",
  "48202000": "Exercise books & notebooks", "96081019": "Ball-point pens — other", "96091000": "Pencils & crayons",
  "48201010": "Registers & account books", "95030090": "Toys — other (puzzles, craft kits)",
  "33049910": "Face creams & skin-care creams", "33049990": "Other beauty, make-up & skin-care preparations", "33051090": "Shampoos — other",
  "33030010": "Perfumes", "33079090": "Other toilet & personal-care preparations", "34013019": "Face wash / body wash (liquid skin-washing products)",
  "33059011": "Hair oils", "09024020": "Black tea", "09012190": "Roasted coffee — other", "09109100": "Spice mixtures (masala)",
  "08013200": "Cashew nuts, shelled", "19059090": "Other bakery products (biscuits, rusk)", "20019000": "Pickles — vegetables / fruits in vinegar",
  "11010000": "Wheat flour (atta)", "10063020": "Basmati rice", "04090000": "Natural honey",
  "21069099": "Food supplements / nutraceuticals", "30049011": "Ayurvedic medicines — packed in doses", "21061000": "Protein concentrates (protein powder)",
  "30039011": "Ayurvedic medicines — not in doses", "73239390": "Kitchen & household articles of stainless steel",
  "76151030": "Aluminium kitchenware (e.g., pressure cookers)", "39241090": "Plastic tableware & kitchenware — other", "69120010": "Ceramic tableware (crockery)",
  "70134900": "Glass tableware — other", "82159900": "Spoons, ladles & kitchen tools — other", "96170019": "Vacuum flasks & bottles — other",
  "63022100": "Bed linen — printed, of cotton", "63039200": "Curtains — of synthetic fibres", "63049260": "Furnishing articles of cotton (cushion covers etc.)",
  "63026000": "Towels — terry, of cotton", "57050049": "Rugs, mats & floor coverings — other", "63014000": "Blankets — of synthetic fibres",
  "91052100": "Wall clocks — battery operated", "44201000": "Wooden statuettes & ornaments", "83062990": "Metal statuettes & ornaments — other",
  "94051000": "Ceiling & wall lights", "67029090": "Artificial flowers — of other materials", "70139900": "Decorative glassware — other",
  "44140000": "Wooden photo / mirror frames", "94013000": "Swivel chairs with adjustable height (office chairs)", "94036000": "Wooden furniture — other",
  "94038900": "Furniture of other materials (bamboo, cane etc.)", "94017100": "Upholstered seats with metal frames", "94042990": "Mattresses — of other materials",
  "95030010": "Wheeled toys (tricycles, scooters, pedal cars)", "95030030": "Toys (heading 9503: dolls, models, puzzles)", "95049090": "Board games & table games — other",
  "96190010": "Hygiene articles (heading 9619: pads, diapers)", "34011190": "Toilet soap — other",
  "95069990": "Sports & outdoor equipment — other", "95066210": "Inflatable balls (footballs etc.)", "95069110": "Gym & fitness equipment",
  "95065190": "Tennis rackets — other", "95063900": "Golf equipment — other", "87120010": "Bicycles",
};
function hsnDesc(code) {
  const c = String(code || "").trim();
  return HSN_INFO[c] || HSN_HEADINGS[c.slice(0, 4)] || "";
}
// "cotton t-shirt", "6109", "earphones" → [{ code, desc }]
function searchHsn(q, limit = 8) {
  const s = String(q || "").trim().toLowerCase();
  if (!s) return [];
  const terms = s.split(/\s+/);
  const all = Object.entries(HSN_INFO).map(([code, desc]) => ({ code, desc }))
    .concat(Object.entries(HSN_HEADINGS).map(([code, desc]) => ({ code, desc: desc + " (heading)" })));
  return all.filter(({ code, desc }) => /^\d+$/.test(s) ? code.startsWith(s) : terms.every((w) => desc.toLowerCase().includes(w.replace(/s$/, ""))))
    .slice(0, limit);
}
const SKU_RE = /^[A-Za-z0-9_-]{3,40}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const TITLE_BANNED = /(₹|\brs\.?\s*\d|\d+\s*%|\boff\b|\bfree\b|\bdiscount\b|\bsale\b|\bbest\b|\bcheapest\b|\boffer\b|\bcod\b|\bbuy\s?now\b)/i;
const TITLE_UNITS = /\b\d+(\.\d+)?\s?(g|gm|gms|kg|ml|l|ltr|cm|mm|inch|inches)\b/i;
const CONTACT_RE = /(https?:\/\/|www\.|\b[6-9]\d{9}\b|[\w.]+@[\w.]+\.\w+)/i;

function isbn13Valid(raw) {
  const d = String(raw || "").replace(/[-\s]/g, "");
  if (!/^97[89]\d{10}$/.test(d)) return false;
  const sum = [...d.slice(0, 12)].reduce((s, ch, i) => s + Number(ch) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(d[12]);
}

const blank = (v) => v === undefined || v === null || String(v).trim() === "";
const party = (p) => p && !blank(p.name) && !blank(p.address) && PINCODE_RE.test(String(p.pincode || ""));

// L = listing draft, ctx = { forSubmit, approvalOk, otherSkus:Set, limitReached }
function validateListing(L, ctx = {}) {
  const errors = [], warnings = [];
  const E = (path, msg) => errors.push({ path, msg });
  const W = (path, msg) => warnings.push({ path, msg });
  const v = getVertical(L.vertical);
  const tpl = templateOf(v);
  if (!v) { E("vertical", "Choose a category / vertical"); return { errors, warnings }; }

  // --- Product details ---
  const title = String(L.name || "").trim();
  if (title.length < 10) E("name", "Product name must be at least 10 characters");
  else if (title.length > 150) E("name", "Product name max 150 characters");
  if (TITLE_BANNED.test(title)) E("name", "Don't put price / offer words (₹, % off, free, sale, best) in the name");
  const wordsInTitle = title.toLowerCase().match(/[a-z]{4,}/g) || [];
  const repeated = wordsInTitle.find((w, i) => wordsInTitle.filter((x) => x === w).length >= 3);
  if (repeated) E("name", `Keyword stuffing: "${repeated}" is repeated`);
  if (title && title === title.toUpperCase() && /[A-Z]{4}/.test(title)) W("name", "Don't write the whole name in CAPITAL letters");
  if (TITLE_UNITS.test(title) && !["grocery", "beauty", "health", "baby_care"].includes(v.template)) W("name", "Don't put weight / size in the name — use the attributes instead");
  if (blank(L.brand)) E("brand", "Enter the brand (use 'Generic' if you don't have one)");
  else if (String(L.brand).length > 50) E("brand", "Brand max 50 characters");
  const desc = String(L.description || "").trim();
  if (desc.length < 30) E("description", "Description must be at least 30 characters");
  if (desc.length > 2000) E("description", "Description max 2000 characters");
  if (CONTACT_RE.test(desc) || CONTACT_RE.test(title)) E("description", "Phone numbers, emails and website links aren't allowed");

  // --- Category attributes ---
  tpl.req.forEach((a) => {
    const val = L.attrs && L.attrs[a.k];
    if (blank(val)) E(`attrs.${a.k}`, `${a.l} is required`);
    else if (a.o && !a.o.includes(val)) E(`attrs.${a.k}`, `${a.l}: choose a value from the list`);
    else if (a.t === "number" && !(Number(val) > 0)) E(`attrs.${a.k}`, `${a.l}: enter a valid number`);
  });
  if (v.template === "books" && L.attrs && !blank(L.attrs.isbn) && !isbn13Valid(L.attrs.isbn)) E("attrs.isbn", "Invalid ISBN-13 (checksum doesn't match)");
  if (v.template === "grocery" && L.attrs && !blank(L.attrs.fssaiNumber) && !/^\d{14}$/.test(String(L.attrs.fssaiNumber))) E("attrs.fssaiNumber", "The FSSAI number has 14 digits");
  if (v.template === "toys" && L.attrs && !blank(L.attrs.bisNumber) && !/^CM\/L-?\s?\d{6,10}$/i.test(String(L.attrs.bisNumber).trim())) E("attrs.bisNumber", "Format: CM/L-1234567890");

  // --- Variants / inventory ---
  const sizes = sizesOf(v);
  const vars = L.variants || [];
  if (!vars.length) E("variants", sizes ? "Select at least one size" : "Enter the SKU and stock");
  const seen = new Set();
  vars.forEach((x, i) => {
    if (sizes && blank(x.size)) E(`variants.${i}.size`, "Select a size");
    if (!SKU_RE.test(String(x.sku || ""))) E(`variants.${i}.sku`, "SKU: 3–40 letters/numbers/-/_");
    else if (seen.has(x.sku.toUpperCase()) || (ctx.otherSkus && ctx.otherSkus.has(x.sku.toUpperCase()))) E(`variants.${i}.sku`, "This SKU is already in use");
    seen.add(String(x.sku || "").toUpperCase());
    if (!(Number.isInteger(Number(x.stock)) && Number(x.stock) >= 0 && Number(x.stock) <= 100000)) E(`variants.${i}.stock`, "Stock 0–100000");
  });
  if (vars.length && vars.every((x) => Number(x.stock) === 0)) W("variants", "All sizes have 0 stock — the listing will show 'Out of stock'");
  if (sizes && tpl.sizeChart && vars.length) {
    const missing = vars.some((x) => tpl.sizeChart.some((f) => !(Number(L.sizeChart && L.sizeChart[x.size] && L.sizeChart[x.size][f.k]) > 0)));
    if (missing) E("sizeChart", "Fill in the size chart (measurements) for every size");
  }

  // --- Price & tax ---
  const mrp = Number(L.mrp), price = Number(L.price);
  if (!(Number.isInteger(mrp) && mrp >= 1 && mrp <= 500000)) E("mrp", "MRP positive whole number (₹1–5,00,000)");
  if (!(price >= 1)) E("price", "Enter the selling price");
  else if (mrp && price > mrp) E("price", "Selling price can't be higher than the MRP");
  else if (mrp && price < mrp * 0.2) W("price", "More than 80% off — this may look like a fake MRP and fail QC");
  if (blank(L.gst)) E("gst", "Choose the GST rate");
  else if (!tpl.gst.includes(Number(L.gst))) W("gst", `This category is usually ${tpl.gst.join("% / ")}% — please double-check`);
  if (!HSN_RE.test(String(L.hsn || ""))) E("hsn", "HSN code must have 4, 6 or 8 digits");

  // --- Images (Section 8) ---
  const imgs = L.images || [];
  if (imgs.length < tpl.images.min) E("images", `At least ${tpl.images.min} image(s) required`);
  else if (imgs.length < tpl.images.rec) W("images", `${tpl.images.rec} images recommended (you have ${imgs.length})`);
  imgs.forEach((im, i) => {
    const longSide = Math.max(im.w, im.h);
    // Any size works — small / odd-ratio photos are only a suggestion (they don't block submit).
    // New uploads are fitted to the ratio automatically (media.js processProductImage).
    if (im.w && longSide < 1000) W(`images.${i}`, `Image ${i + 1}: ${im.w}×${im.h} — 1000px+ is better for zoom`);
    if (tpl.images.ratio && im.w && im.h) {
      const [rw, rh] = tpl.images.ratio;
      if (Math.abs(im.w / im.h - rw / rh) > 0.03) W(`images.${i}`, `Image ${i + 1}: ${rw}:${rh} is better (now ${im.w}×${im.h}) — upload it again and it will be fitted automatically`);
    }
  });
  if (imgs[0] && imgs[0].whiteBg === false) W("images.0", "Use a white background for the main image — product only (no text / logo / props)");

  // --- Shipping ---
  const pkg = L.pkg || {};
  ["l", "b", "h"].forEach((d) => { if (!(Number(pkg[d]) > 0 && Number(pkg[d]) <= 200)) E(`pkg.${d}`, "Package dimension (cm) 0–200"); });
  if (!(Number(pkg.w) > 0 && Number(pkg.w) <= 50000)) E("pkg.w", "Enter the package weight (g)");
  if (["l", "b", "h"].some((d) => Number(pkg[d]) > 0 && Number(pkg[d]) < 2)) W("pkg.l", "These dimensions look wrong (e.g. 10×1×1) — wrong values lead to wrong shipping fees");
  if (Number(pkg.w) > 0 && Number(pkg.w) < 30) W("pkg.w", "This weight looks too low — include the packaging");
  if (!OPT.sla.includes(String(L.sla))) E("sla", "Choose a dispatch time (1–7 days)");

  // --- Compliance (Legal Metrology) ---
  if (blank(L.countryOfOrigin)) E("countryOfOrigin", "Choose the country of origin");
  if (blank(L.genericName)) E("genericName", "Choose the generic name");
  if (!(Number.isInteger(Number(L.netQty)) && Number(L.netQty) >= 1)) E("netQty", "Enter the net quantity (pieces)");
  ["manufacturer", "packer", "importer"].forEach((p) => {
    const d = L[p] || {};
    if (blank(d.name) || String(d.name).trim().length < 3) E(`${p}.name`, "Enter a name");
    if (blank(d.address) || String(d.address).trim().length < 10) E(`${p}.address`, "Enter the full address");
    if (!PINCODE_RE.test(String(d.pincode || ""))) E(`${p}.pincode`, "6-digit pincode");
  });

  // --- Account level ---
  if (ctx.forSubmit) {
    if (tpl.restricted && !ctx.approvalOk) E("approval", `You need category approval to sell in ${RESTRICTED[tpl.restricted].label}`);
    if (ctx.limitReached) E("plan", "You've reached your plan's listing limit — please upgrade your subscription");
  }
  return { errors, warnings };
}

// =====================================================================
// Listing quality score
// =====================================================================
function listingQuality(L) {
  const v = getVertical(L.vertical);
  const tpl = templateOf(v);
  if (!tpl) return { score: 0, label: "Incomplete", missingGood: [], reqDone: 0, reqTotal: 1 };
  const commonReq = [
    !blank(L.name), !blank(L.brand), String(L.description || "").trim().length >= 30, Number(L.mrp) > 0, Number(L.price) > 0,
    !blank(L.gst), HSN_RE.test(String(L.hsn || "")), !blank(L.countryOfOrigin), !blank(L.genericName), Number(L.netQty) >= 1,
    party(L.manufacturer), party(L.packer), party(L.importer),
    Number(L.pkg && L.pkg.w) > 0 && Number(L.pkg && L.pkg.l) > 0, !blank(L.sla), (L.variants || []).length > 0,
  ];
  const attrReq = tpl.req.map((a) => !blank(L.attrs && L.attrs[a.k]));
  const req = commonReq.concat(attrReq);
  const reqDone = req.filter(Boolean).length;
  const goodItems = tpl.good.map((a) => ({ label: a.l, ok: !blank(L.attrs && L.attrs[a.k]) }))
    .concat([
      { label: "3+ Key features", ok: (L.features || []).filter((f) => !blank(f)).length >= 3 },
      { label: "Search keywords", ok: !blank(L.keywords) },
      { label: "EAN / UPC barcode", ok: !blank(L.ean) },
    ]);
  const goodDone = goodItems.filter((g) => g.ok).length;
  const imgCount = L.imageCount !== undefined && !L.images ? L.imageCount : (L.images || []).length;
  const imgScore = Math.min(1, imgCount / tpl.images.rec);
  const score = Math.round((reqDone / req.length) * 60 + (goodDone / goodItems.length) * 25 + imgScore * 15);
  const label = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Average" : "Poor";
  return { score, label, reqDone, reqTotal: req.length, goodDone, goodTotal: goodItems.length, missingGood: goodItems.filter((g) => !g.ok).map((g) => g.label), imgCount, imgRec: tpl.images.rec };
}

// Common QC rejection reasons (Section 15)
const QC_REASONS = [
  "Main image has text / watermark / logo / price",
  "Image is blurry, pixelated or stretched",
  "Product is in the wrong category / vertical",
  "Title has keyword stuffing or promotional words",
  "Incorrect MRP / price or fake discount",
  "HSN / GST doesn't match the product",
  "Manufacturer / packer details are incomplete",
  "Description and images don't match",
];
