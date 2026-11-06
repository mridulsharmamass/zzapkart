// =====================================================================
// Zzapkart Catalog: category tree, listing form schema, rules, fees
//
// Research report (Amazon · Flipkart · Meesho, Nov 2026) ke hisaab se:
//  - har listing me "common compulsory" details (Section 7)
//  - category ke hisaab se extra compulsory + good-to-have fields (Section 10–13)
//  - image rules (Section 8), price / GST / HSN / compliance (Section 9)
//  - restricted categories ke liye approval (Section 14)
//  - rejection se bachne ke rules (Section 15)
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

// ---------- Restricted (approval wali) categories — Section 14 ----------
const RESTRICTED = {
  fssai: { label: "Grocery & Food", license: "FSSAI License", pattern: /^\d{14}$/, hint: "14-digit FSSAI license number" },
  health: { label: "Health & Supplements", license: "FSSAI / AYUSH / Drug License", pattern: /^[A-Za-z0-9/-]{6,25}$/, hint: "License number (6–25 characters)" },
};

// ---------- Templates: har product type ka form ----------
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
  styleCode: { k: "styleCode", l: "Style Code", t: "text", hint: "Jaise ZZ-CL-RN01 (sab sizes ka ek hi)" },
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
    label: "Topwear", commission: 12, gst: [5, 18], gstHint: "Apparel: ₹2,500 tak 5%, usse upar 18% (final rate CA se confirm karein)",
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
    label: "Bottomwear", commission: 12, gst: [5, 18], gstHint: "Apparel: ₹2,500 tak 5%, usse upar 18% (CA se confirm karein)",
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
    label: "Ethnic Wear", commission: 12, gst: [5, 18], gstHint: "Apparel: ₹2,500 tak 5%, usse upar 18% (CA se confirm karein)",
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
    label: "Innerwear & Sleepwear", commission: 13, gst: [5, 18], gstHint: "Apparel: ₹2,500 tak 5%, usse upar 18% (CA se confirm karein)",
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
    label: "Footwear", commission: 13, gst: [5, 18], gstHint: "Footwear: ₹2,500 tak 5%, usse upar 18% (CA se confirm karein)",
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
    label: "Bags & Wallets", commission: 10, gst: [18, 5], gstHint: "Leather / synthetic bags zyadatar 18% (CA se confirm karein)",
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
    label: "Watches", commission: 10, gst: [18], gstHint: "Watches: 18% (CA se confirm karein)",
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
    label: "Fashion Jewellery", commission: 12, gst: [3], gstHint: "Imitation / fashion jewellery (HSN 7117): 3% (CA se confirm karein)",
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
    label: "Fashion Accessories", commission: 12, gst: [18, 5], gstHint: "Item ke hisaab se (CA se confirm karein)",
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
    label: "Electronics", commission: 7, gst: [18], gstHint: "Electronics: zyadatar 18% (CA se confirm karein)",
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
    label: "Mobile Accessories", commission: 10, gst: [18], gstHint: "18% (CA se confirm karein)",
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
    label: "Stationery", commission: 8, gst: [0, 5, 18], gstHint: "Item ke hisaab se (notebooks / pens alag) — CA se confirm karein",
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
    label: "Beauty & Personal Care", commission: 8, gst: [5, 18], gstHint: "Product ke hisaab se 5% ya 18% — CA se confirm karein",
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
    label: "Grocery & Food", commission: 5, gst: [0, 5, 18], gstHint: "Food item ke hisaab se 0% / 5% / 18% — CA se confirm karein",
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
    label: "Health & Supplements", commission: 7, gst: [5, 18], gstHint: "Product ke hisaab se — CA se confirm karein",
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
    label: "Kitchen & Dining", commission: 9, gst: [5, 18], gstHint: "Material / item ke hisaab se — CA se confirm karein",
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
    label: "Home Furnishing", commission: 9, gst: [5, 18], gstHint: "Textile: ₹2,500 tak 5%, usse upar 18% (CA se confirm karein)",
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
    label: "Home Decor", commission: 10, gst: [5, 18], gstHint: "Item ke hisaab se — CA se confirm karein",
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
    label: "Furniture", commission: 10, gst: [18], gstHint: "Furniture: 18% (CA se confirm karein)",
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
    label: "Toys & Games", commission: 9, gst: [5, 18], gstHint: "Toys: product ke hisaab se — CA se confirm karein",
    hsn: ["95030010", "95030030", "95030090", "95049090"], generic: ["Toys"],
    images: { min: 1, rec: 5, ratio: null }, sizes: null,
    req: [
      { k: "minAge", l: "Minimum Age", o: ["0+ months", "6+ months", "1+ years", "2+ years", "3+ years", "5+ years", "8+ years", "12+ years", "14+ years"] },
      { k: "type", l: "Type", o: ["Soft Toy", "Educational Toy", "Remote Control Toy", "Puzzle", "Board Game", "Building Blocks", "Action Figure", "Doll", "Musical Toy", "Ride-on", "Outdoor Toy"] },
      { k: "material", l: "Material", o: ["Plastic", "Polyester / Plush", "Wood", "Cardboard", "Metal", "Fabric", "Foam"] },
      { k: "batteryOperated", l: "Battery Operated", o: OPT.yesNo },
      A.color,
      { k: "bisNumber", l: "BIS License (CM/L) No.", t: "text", hint: "CM/L-1234567890 (toys ke liye BIS zaroori)" },
      A.packOf],
    good: [
      { k: "maxAge", l: "Maximum Age", t: "text" },
      { k: "character", l: "Character", t: "text" },
      { k: "pieces", l: "Number of Pieces", t: "number" },
      { k: "salesPackage", l: "Items Included", t: "text" }],
  },
  baby_care: {
    label: "Baby Care", commission: 8, gst: [5, 18], gstHint: "Product ke hisaab se — CA se confirm karein",
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
    label: "Sports & Fitness", commission: 9, gst: [5, 18], gstHint: "Sports goods: product ke hisaab se — CA se confirm karein",
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
// Super category ka naam storefront CATEGORIES (products.js) se match karta hai
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
// Fees — Zzapkart demo fee schedule (Section 9: "settlement amount se profit nikalein")
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
  if (!v) { E("vertical", "Category / vertical chunein"); return { errors, warnings }; }

  // --- Product details ---
  const title = String(L.name || "").trim();
  if (title.length < 10) E("name", "Product name kam se kam 10 characters");
  else if (title.length > 150) E("name", "Product name max 150 characters");
  if (TITLE_BANNED.test(title)) E("name", "Name me price / offer words (₹, % off, free, sale, best) nahi likhein");
  const wordsInTitle = title.toLowerCase().match(/[a-z]{4,}/g) || [];
  const repeated = wordsInTitle.find((w, i) => wordsInTitle.filter((x) => x === w).length >= 3);
  if (repeated) E("name", `Keyword stuffing: "${repeated}" baar-baar likha hai`);
  if (title && title === title.toUpperCase() && /[A-Z]{4}/.test(title)) W("name", "Poora naam CAPITAL letters me na likhein");
  if (TITLE_UNITS.test(title) && !["grocery", "beauty", "health", "baby_care"].includes(v.template)) W("name", "Naam me weight / size na daalein — wo attributes me bharein");
  if (blank(L.brand)) E("brand", "Brand daalein (apna brand nahi hai to 'Generic')");
  else if (String(L.brand).length > 50) E("brand", "Brand max 50 characters");
  const desc = String(L.description || "").trim();
  if (desc.length < 30) E("description", "Description kam se kam 30 characters");
  if (desc.length > 2000) E("description", "Description max 2000 characters");
  if (CONTACT_RE.test(desc) || CONTACT_RE.test(title)) E("description", "Phone, email ya website link allowed nahi");

  // --- Category attributes ---
  tpl.req.forEach((a) => {
    const val = L.attrs && L.attrs[a.k];
    if (blank(val)) E(`attrs.${a.k}`, `${a.l} compulsory hai`);
    else if (a.o && !a.o.includes(val)) E(`attrs.${a.k}`, `${a.l}: list me se value chunein`);
    else if (a.t === "number" && !(Number(val) > 0)) E(`attrs.${a.k}`, `${a.l}: sahi number daalein`);
  });
  if (v.template === "books" && L.attrs && !blank(L.attrs.isbn) && !isbn13Valid(L.attrs.isbn)) E("attrs.isbn", "ISBN-13 galat hai (checksum match nahi hua)");
  if (v.template === "grocery" && L.attrs && !blank(L.attrs.fssaiNumber) && !/^\d{14}$/.test(String(L.attrs.fssaiNumber))) E("attrs.fssaiNumber", "FSSAI number 14 digits ka hota hai");
  if (v.template === "toys" && L.attrs && !blank(L.attrs.bisNumber) && !/^CM\/L-?\s?\d{6,10}$/i.test(String(L.attrs.bisNumber).trim())) E("attrs.bisNumber", "Format: CM/L-1234567890");

  // --- Variants / inventory ---
  const sizes = sizesOf(v);
  const vars = L.variants || [];
  if (!vars.length) E("variants", sizes ? "Kam se kam ek size chunein" : "SKU aur stock daalein");
  const seen = new Set();
  vars.forEach((x, i) => {
    if (sizes && blank(x.size)) E(`variants.${i}.size`, "Size chunein");
    if (!SKU_RE.test(String(x.sku || ""))) E(`variants.${i}.sku`, "SKU: 3–40 letters/numbers/-/_");
    else if (seen.has(x.sku.toUpperCase()) || (ctx.otherSkus && ctx.otherSkus.has(x.sku.toUpperCase()))) E(`variants.${i}.sku`, "Ye SKU pehle se use ho chuka hai");
    seen.add(String(x.sku || "").toUpperCase());
    if (!(Number.isInteger(Number(x.stock)) && Number(x.stock) >= 0 && Number(x.stock) <= 100000)) E(`variants.${i}.stock`, "Stock 0–100000");
  });
  if (vars.length && vars.every((x) => Number(x.stock) === 0)) W("variants", "Sab sizes ka stock 0 hai — listing 'Out of stock' dikhegi");
  if (sizes && tpl.sizeChart && vars.length) {
    const missing = vars.some((x) => tpl.sizeChart.some((f) => !(Number(L.sizeChart && L.sizeChart[x.size] && L.sizeChart[x.size][f.k]) > 0)));
    if (missing) E("sizeChart", "Har size ka size chart (measurements) bharein");
  }

  // --- Price & tax ---
  const mrp = Number(L.mrp), price = Number(L.price);
  if (!(Number.isInteger(mrp) && mrp >= 1 && mrp <= 500000)) E("mrp", "MRP positive whole number (₹1–5,00,000)");
  if (!(price >= 1)) E("price", "Selling price daalein");
  else if (mrp && price > mrp) E("price", "Selling price MRP se zyada nahi ho sakta");
  else if (mrp && price < mrp * 0.2) W("price", "80% se zyada discount — fake MRP lag sakta hai, QC reject ho sakta hai");
  if (blank(L.gst)) E("gst", "GST rate chunein");
  else if (!tpl.gst.includes(Number(L.gst))) W("gst", `Is category ke liye aam taur par ${tpl.gst.join("% / ")}% — dobara check karein`);
  if (!HSN_RE.test(String(L.hsn || ""))) E("hsn", "HSN code 4, 6 ya 8 digits ka");

  // --- Images (Section 8) ---
  const imgs = L.images || [];
  if (imgs.length < tpl.images.min) E("images", `Kam se kam ${tpl.images.min} image compulsory`);
  else if (imgs.length < tpl.images.rec) W("images", `${tpl.images.rec} images recommended (abhi ${imgs.length})`);
  imgs.forEach((im, i) => {
    const longSide = Math.max(im.w, im.h);
    if (longSide < 500) E(`images.${i}`, `Image ${i + 1}: resolution bahut kam (${im.w}×${im.h}) — kam se kam 500px`);
    else if (longSide < 1000) W(`images.${i}`, `Image ${i + 1}: zoom ke liye 1000px+ recommended`);
    if (tpl.images.ratio) {
      const [rw, rh] = tpl.images.ratio;
      if (Math.abs(im.w / im.h - rw / rh) > 0.03) E(`images.${i}`, `Image ${i + 1}: ${rw}:${rh} ratio chahiye (jaise 1500×1800), abhi ${im.w}×${im.h}`);
    }
  });
  if (imgs[0] && imgs[0].whiteBg === false) W("images.0", "Main image ka background white rakhein, sirf product (koi text / logo / props nahi)");

  // --- Shipping ---
  const pkg = L.pkg || {};
  ["l", "b", "h"].forEach((d) => { if (!(Number(pkg[d]) > 0 && Number(pkg[d]) <= 200)) E(`pkg.${d}`, "Package dimension (cm) 0–200"); });
  if (!(Number(pkg.w) > 0 && Number(pkg.w) <= 50000)) E("pkg.w", "Package weight (g) daalein");
  if (["l", "b", "h"].some((d) => Number(pkg[d]) > 0 && Number(pkg[d]) < 2)) W("pkg.l", "Dimensions galat lag rahe (jaise 10×1×1) — galat value se shipping fee galat lagegi");
  if (Number(pkg.w) > 0 && Number(pkg.w) < 30) W("pkg.w", "Weight bahut kam lag raha hai — packaging ke saath weight daalein");
  if (!OPT.sla.includes(String(L.sla))) E("sla", "Dispatch time (1–7 din) chunein");

  // --- Compliance (Legal Metrology) ---
  if (blank(L.countryOfOrigin)) E("countryOfOrigin", "Country of origin chunein");
  if (blank(L.genericName)) E("genericName", "Generic name chunein");
  if (!(Number.isInteger(Number(L.netQty)) && Number(L.netQty) >= 1)) E("netQty", "Net quantity (pieces) daalein");
  ["manufacturer", "packer", "importer"].forEach((p) => {
    const d = L[p] || {};
    if (blank(d.name) || String(d.name).trim().length < 3) E(`${p}.name`, "Naam daalein");
    if (blank(d.address) || String(d.address).trim().length < 10) E(`${p}.address`, "Poora address daalein");
    if (!PINCODE_RE.test(String(d.pincode || ""))) E(`${p}.pincode`, "6-digit pincode");
  });

  // --- Account level ---
  if (ctx.forSubmit) {
    if (tpl.restricted && !ctx.approvalOk) E("approval", `${RESTRICTED[tpl.restricted].label} me bechne ke liye category approval chahiye`);
    if (ctx.limitReached) E("plan", "Plan ki listing limit poori ho gayi — subscription upgrade karein");
  }
  return { errors, warnings };
}

// =====================================================================
// Listing quality score (Flipkart "Listing quality", Amazon "Enhance listings")
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

// Admin QC ke common rejection reasons (Section 15)
const QC_REASONS = [
  "Main image me text / watermark / logo / price hai",
  "Image blur, pixelated ya stretched hai",
  "Product galat category / vertical me hai",
  "Title me keyword stuffing ya promotional words",
  "MRP / price galat ya fake discount",
  "HSN / GST product se match nahi karta",
  "Manufacturer / packer details adhoore",
  "Description aur images match nahi karte",
];
