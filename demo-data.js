// Demo sellers with Brand Stores and listings (fictional brands, original artwork).
// store.js seeds these into the browser once (see seedDemoData). Demo seller password: Demo@1234
const DEMO_VERSION = "2026-11-a";
const DEMO_SELLERS = [
 {
  "seller": {
   "id": "DEMO-URBAN",
   "name": "Rohan Mehta",
   "shopName": "Urban Loom Clothing",
   "email": "urbanloom@demo.zzapkart.in",
   "phone": "9810000001",
   "salt": "demo-salt-2026",
   "passwordHash": "2eb6cd9078faf406bc8dee3f6317681638977a19bd674d197f895209d5c4c480",
   "demo": true,
   "kyc": {
    "status": "approved",
    "docType": "pan",
    "docNumber": "AAAPZ1000K",
    "address": "Delhi, India – 110020",
    "addressProofType": "GST Certificate"
   },
   "profile": {
    "businessName": "Urban Loom Clothing",
    "pickup": {
     "address": "Urban Loom Clothing, Delhi",
     "city": "Delhi",
     "state": "",
     "pincode": "110020"
    }
   },
   "autoRenew": true,
   "adCredits": 0,
   "fssai": ""
  },
  "store": {
   "name": "Urban Loom",
   "slug": "urban-loom",
   "tagline": "Everyday wear, woven with care",
   "about": "Urban Loom started in a small Delhi studio in 2018 with one idea — clothes you actually want to wear every day. We work with local weavers and use breathable cotton and linen, so every piece feels as good as it looks.",
   "theme": "custom",
   "returnDays": "7",
   "logo": "images/brands/urban-loom.svg",
   "banners": [
    {
     "id": "BNR-urban-loom",
     "src": "images/banners/urban-loom.svg",
     "headline": "The New Season Edit",
     "sub": "Breathable cotton and linen essentials",
     "cta": "Shop now",
     "link": "all",
     "tone": "light",
     "w": 1500,
     "h": 500
    }
   ],
   "featured": [
    900101,
    900102,
    900103,
    900104
   ],
   "collections": [
    {
     "id": "C00",
     "name": "Tees",
     "productIds": [
      900101,
      900106
     ]
    },
    {
     "id": "C01",
     "name": "Winter",
     "productIds": [
      900102
     ]
    },
    {
     "id": "C02",
     "name": "Shirts",
     "productIds": [
      900103,
      900105
     ]
    },
    {
     "id": "C03",
     "name": "Denim",
     "productIds": [
      900104
     ]
    }
   ],
   "showNew": true,
   "design": {
    "color": "#1e3a8a",
    "font": "montserrat",
    "header": "light",
    "buttons": "rounded",
    "cols": 4,
    "announceOn": true,
    "announce": "New season drop is live — free delivery above ₹499"
   }
  },
  "listings": [
   {
    "id": 900101,
    "sellerId": "DEMO-URBAN",
    "vertical": "men-top-wear-t-shirts",
    "category": "Fashion",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Urban Loom Oversized Graphic Tee",
    "brand": "Urban Loom",
    "description": "A relaxed oversized fit in heavy 220 GSM cotton with a soft-touch print.",
    "features": [
     "220 GSM cotton",
     "Oversized fit",
     "Soft-touch print",
     "Pre-shrunk"
    ],
    "keywords": "",
    "attrs": {
     "color": "Black",
     "fabric": "Cotton",
     "fit": "Oversized",
     "sleeve": "Half Sleeve",
     "neck": "Round Neck",
     "pattern": "Printed",
     "idealFor": "Men"
    },
    "sizeChart": {},
    "rating": 4.4,
    "variants": [
     {
      "id": "V900101-0",
      "size": "S",
      "sku": "URBA-900101-S",
      "stock": 33
     },
     {
      "id": "V900101-1",
      "size": "M",
      "sku": "URBA-900101-M",
      "stock": 40
     },
     {
      "id": "V900101-2",
      "size": "L",
      "sku": "URBA-900101-L",
      "stock": 47
     },
     {
      "id": "V900101-3",
      "size": "XL",
      "sku": "URBA-900101-XL",
      "stock": 14
     }
    ],
    "mrp": 999,
    "price": 549,
    "gst": 5,
    "hsn": "61091000",
    "countryOfOrigin": "India",
    "genericName": "Tshirts",
    "netQty": 1,
    "manufacturer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "packer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "importer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/urban-loom-oversized-graphic-tee.svg",
    "imageCount": 0,
    "quality": 92,
    "video": {
     "kind": "src",
     "src": "images/reels/urban-loom-oversized-graphic-tee.mp4",
     "poster": "images/p/urban-loom-oversized-graphic-tee.svg"
    }
   },
   {
    "id": 900102,
    "sellerId": "DEMO-URBAN",
    "vertical": "men-top-wear-sweatshirts-and-hoodies",
    "category": "Fashion",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Urban Loom Fleece Hoodie",
    "brand": "Urban Loom",
    "description": "Brushed-fleece hoodie with a roomy kangaroo pocket — your go-to layer.",
    "features": [
     "Brushed fleece inside",
     "Kangaroo pocket",
     "Ribbed cuffs",
     "Regular fit"
    ],
    "keywords": "",
    "attrs": {
     "color": "Grey",
     "fabric": "Cotton Blend",
     "fit": "Regular",
     "sleeve": "Full Sleeve",
     "neck": "Hooded Neck",
     "pattern": "Solid",
     "idealFor": "Men"
    },
    "sizeChart": {},
    "rating": 4.5,
    "variants": [
     {
      "id": "V900102-0",
      "size": "S",
      "sku": "URBA-900102-S",
      "stock": 34
     },
     {
      "id": "V900102-1",
      "size": "M",
      "sku": "URBA-900102-M",
      "stock": 41
     },
     {
      "id": "V900102-2",
      "size": "L",
      "sku": "URBA-900102-L",
      "stock": 48
     },
     {
      "id": "V900102-3",
      "size": "XL",
      "sku": "URBA-900102-XL",
      "stock": 15
     }
    ],
    "mrp": 1999,
    "price": 1199,
    "gst": 5,
    "hsn": "61091000",
    "countryOfOrigin": "India",
    "genericName": "Tshirts",
    "netQty": 1,
    "manufacturer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "packer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "importer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/urban-loom-fleece-hoodie.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900103,
    "sellerId": "DEMO-URBAN",
    "vertical": "men-top-wear-shirts",
    "category": "Fashion",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Urban Loom Oxford Shirt",
    "brand": "Urban Loom",
    "description": "A crisp Oxford cotton shirt that works from office to weekend.",
    "features": [
     "Oxford cotton",
     "Button-down collar",
     "Slim fit",
     "Easy iron"
    ],
    "keywords": "",
    "attrs": {
     "color": "Blue",
     "fabric": "Cotton",
     "fit": "Slim",
     "sleeve": "Full Sleeve",
     "neck": "Collared",
     "pattern": "Solid",
     "idealFor": "Men"
    },
    "sizeChart": {},
    "rating": 4.3,
    "variants": [
     {
      "id": "V900103-0",
      "size": "S",
      "sku": "URBA-900103-S",
      "stock": 35
     },
     {
      "id": "V900103-1",
      "size": "M",
      "sku": "URBA-900103-M",
      "stock": 42
     },
     {
      "id": "V900103-2",
      "size": "L",
      "sku": "URBA-900103-L",
      "stock": 49
     },
     {
      "id": "V900103-3",
      "size": "XL",
      "sku": "URBA-900103-XL",
      "stock": 16
     }
    ],
    "mrp": 1499,
    "price": 899,
    "gst": 5,
    "hsn": "61091000",
    "countryOfOrigin": "India",
    "genericName": "Tshirts",
    "netQty": 1,
    "manufacturer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "packer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "importer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/urban-loom-oxford-shirt.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900104,
    "sellerId": "DEMO-URBAN",
    "vertical": "men-bottom-wear-jeans",
    "category": "Fashion",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Urban Loom Slim Fit Jeans",
    "brand": "Urban Loom",
    "description": "Stretch denim slim-fit jeans with a classic mid-rise and five pockets.",
    "features": [
     "Stretch denim",
     "Slim fit",
     "Mid rise",
     "5 pockets"
    ],
    "keywords": "",
    "attrs": {
     "color": "Blue",
     "fabric": "Denim",
     "fit": "Slim",
     "idealFor": "Men"
    },
    "sizeChart": {},
    "rating": 4.2,
    "variants": [
     {
      "id": "V900104-0",
      "size": "28",
      "sku": "URBA-900104-28",
      "stock": 36
     },
     {
      "id": "V900104-1",
      "size": "30",
      "sku": "URBA-900104-30",
      "stock": 43
     },
     {
      "id": "V900104-2",
      "size": "32",
      "sku": "URBA-900104-32",
      "stock": 50
     },
     {
      "id": "V900104-3",
      "size": "34",
      "sku": "URBA-900104-34",
      "stock": 17
     },
     {
      "id": "V900104-4",
      "size": "36",
      "sku": "URBA-900104-36",
      "stock": 24
     }
    ],
    "mrp": 2299,
    "price": 1299,
    "gst": 5,
    "hsn": "62034200",
    "countryOfOrigin": "India",
    "genericName": "Bottom Wear",
    "netQty": 1,
    "manufacturer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "packer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "importer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/urban-loom-slim-fit-jeans.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900105,
    "sellerId": "DEMO-URBAN",
    "vertical": "ethnic-wear-kurtas",
    "category": "Fashion",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Urban Loom Linen Kurta",
    "brand": "Urban Loom",
    "description": "A breathable linen-blend kurta with fine embroidery at the placket.",
    "features": [
     "Linen blend",
     "Embroidered placket",
     "Straight cut",
     "Festive and casual"
    ],
    "keywords": "",
    "attrs": {
     "color": "Yellow",
     "fabric": "Linen",
     "sleeve": "Full Sleeve"
    },
    "sizeChart": {},
    "rating": 4.6,
    "variants": [
     {
      "id": "V900105-0",
      "size": "S",
      "sku": "URBA-900105-S",
      "stock": 37
     },
     {
      "id": "V900105-1",
      "size": "M",
      "sku": "URBA-900105-M",
      "stock": 44
     },
     {
      "id": "V900105-2",
      "size": "L",
      "sku": "URBA-900105-L",
      "stock": 51
     },
     {
      "id": "V900105-3",
      "size": "XL",
      "sku": "URBA-900105-XL",
      "stock": 18
     }
    ],
    "mrp": 1699,
    "price": 999,
    "gst": 5,
    "hsn": "62114290",
    "countryOfOrigin": "India",
    "genericName": "Ethnic Wear",
    "netQty": 1,
    "manufacturer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "packer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "importer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/urban-loom-linen-kurta.svg",
    "imageCount": 0,
    "quality": 92,
    "video": {
     "kind": "src",
     "src": "images/reels/urban-loom-linen-kurta.mp4",
     "poster": "images/p/urban-loom-linen-kurta.svg"
    }
   },
   {
    "id": 900106,
    "sellerId": "DEMO-URBAN",
    "vertical": "eyewear-belts-and-caps-caps-and-hats",
    "category": "Accessories",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Urban Loom Everyday Cap",
    "brand": "Urban Loom",
    "description": "A six-panel cotton cap with an adjustable strap.",
    "features": [
     "Cotton twill",
     "Adjustable strap",
     "Curved brim",
     "One size"
    ],
    "keywords": "",
    "attrs": {
     "color": "Black"
    },
    "sizeChart": {},
    "rating": 4.1,
    "variants": [
     {
      "id": "V900106-0",
      "size": "",
      "sku": "URBA-900106",
      "stock": 38
     }
    ],
    "mrp": 599,
    "price": 349,
    "gst": 18,
    "hsn": "90041000",
    "countryOfOrigin": "India",
    "genericName": "Accessories",
    "netQty": 1,
    "manufacturer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "packer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "importer": {
     "name": "Urban Loom Clothing",
     "address": "Delhi, India",
     "pincode": "110020"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/urban-loom-everyday-cap.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   }
  ]
 },
 {
  "seller": {
   "id": "DEMO-STRIDE",
   "name": "Kavya Iyer",
   "shopName": "Stride Lab Sports",
   "email": "stridelab@demo.zzapkart.in",
   "phone": "9810000002",
   "salt": "demo-salt-2026",
   "passwordHash": "2eb6cd9078faf406bc8dee3f6317681638977a19bd674d197f895209d5c4c480",
   "demo": true,
   "kyc": {
    "status": "approved",
    "docType": "pan",
    "docNumber": "AAAPZ1001K",
    "address": "Bengaluru, India – 560034",
    "addressProofType": "GST Certificate"
   },
   "profile": {
    "businessName": "Stride Lab Sports",
    "pickup": {
     "address": "Stride Lab Sports, Bengaluru",
     "city": "Bengaluru",
     "state": "",
     "pincode": "560034"
    }
   },
   "autoRenew": true,
   "adCredits": 0,
   "fssai": ""
  },
  "store": {
   "name": "Stride Lab",
   "slug": "stride-lab",
   "tagline": "Gear that keeps up with you",
   "about": "Stride Lab designs running shoes and training gear in Bengaluru. Every product is tested by our own run club over hundreds of kilometres before it reaches you.",
   "theme": "custom",
   "returnDays": "7",
   "logo": "images/brands/stride-lab.svg",
   "banners": [
    {
     "id": "BNR-stride-lab",
     "src": "images/banners/stride-lab.svg",
     "headline": "Run Further",
     "sub": "Lightweight shoes tested by our run club",
     "cta": "Shop now",
     "link": "all",
     "tone": "light",
     "w": 1500,
     "h": 500
    }
   ],
   "featured": [
    900201,
    900202,
    900203,
    900204
   ],
   "collections": [
    {
     "id": "C10",
     "name": "Shoes",
     "productIds": [
      900201,
      900202
     ]
    },
    {
     "id": "C11",
     "name": "Gear",
     "productIds": [
      900203,
      900204,
      900205
     ]
    }
   ],
   "showNew": true,
   "design": {
    "color": "#ea580c",
    "font": "poppins",
    "header": "dark",
    "buttons": "pill",
    "cols": 4,
    "announceOn": true,
    "announce": "Run club week — up to 45% off on running shoes"
   }
  },
  "listings": [
   {
    "id": 900201,
    "sellerId": "DEMO-STRIDE",
    "vertical": "footwear-sports-shoes",
    "category": "Fashion",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Stride Lab AirFlex Running Shoes",
    "brand": "Stride Lab",
    "description": "Responsive foam and a breathable knit upper for daily runs.",
    "features": [
     "Responsive foam midsole",
     "Knit upper",
     "Reflective details",
     "250 g"
    ],
    "keywords": "",
    "attrs": {
     "color": "Blue"
    },
    "sizeChart": {},
    "rating": 4.6,
    "variants": [
     {
      "id": "V900201-0",
      "size": "UK 6",
      "sku": "STRI-900201-UK6",
      "stock": 13
     },
     {
      "id": "V900201-1",
      "size": "UK 7",
      "sku": "STRI-900201-UK7",
      "stock": 20
     },
     {
      "id": "V900201-2",
      "size": "UK 8",
      "sku": "STRI-900201-UK8",
      "stock": 27
     },
     {
      "id": "V900201-3",
      "size": "UK 9",
      "sku": "STRI-900201-UK9",
      "stock": 34
     },
     {
      "id": "V900201-4",
      "size": "UK 10",
      "sku": "STRI-900201-UK10",
      "stock": 41
     }
    ],
    "mrp": 3999,
    "price": 2299,
    "gst": 5,
    "hsn": "64041190",
    "countryOfOrigin": "India",
    "genericName": "Footwear",
    "netQty": 1,
    "manufacturer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "packer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "importer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/stride-lab-airflex-running-shoes.svg",
    "imageCount": 0,
    "quality": 92,
    "video": {
     "kind": "src",
     "src": "images/reels/stride-lab-airflex-running-shoes.mp4",
     "poster": "images/p/stride-lab-airflex-running-shoes.svg"
    }
   },
   {
    "id": 900202,
    "sellerId": "DEMO-STRIDE",
    "vertical": "footwear-casual-shoes",
    "category": "Fashion",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Stride Lab Street Sneakers",
    "brand": "Stride Lab",
    "description": "Clean white sneakers with a cushioned insole for all-day wear.",
    "features": [
     "Synthetic leather",
     "Cushioned insole",
     "Rubber outsole",
     "Easy to clean"
    ],
    "keywords": "",
    "attrs": {
     "color": "White"
    },
    "sizeChart": {},
    "rating": 4.3,
    "variants": [
     {
      "id": "V900202-0",
      "size": "UK 6",
      "sku": "STRI-900202-UK6",
      "stock": 14
     },
     {
      "id": "V900202-1",
      "size": "UK 7",
      "sku": "STRI-900202-UK7",
      "stock": 21
     },
     {
      "id": "V900202-2",
      "size": "UK 8",
      "sku": "STRI-900202-UK8",
      "stock": 28
     },
     {
      "id": "V900202-3",
      "size": "UK 9",
      "sku": "STRI-900202-UK9",
      "stock": 35
     },
     {
      "id": "V900202-4",
      "size": "UK 10",
      "sku": "STRI-900202-UK10",
      "stock": 42
     }
    ],
    "mrp": 2999,
    "price": 1799,
    "gst": 5,
    "hsn": "64041190",
    "countryOfOrigin": "India",
    "genericName": "Footwear",
    "netQty": 1,
    "manufacturer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "packer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "importer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/stride-lab-street-sneakers.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900203,
    "sellerId": "DEMO-STRIDE",
    "vertical": "bags-and-luggage-backpacks",
    "category": "Accessories",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Stride Lab Gym Backpack",
    "brand": "Stride Lab",
    "description": "A gym-ready backpack with a ventilated shoe compartment.",
    "features": [
     "Shoe compartment",
     "Bottle pocket",
     "Water resistant",
     "28 L"
    ],
    "keywords": "",
    "attrs": {
     "color": "Black"
    },
    "sizeChart": {},
    "rating": 4.4,
    "variants": [
     {
      "id": "V900203-0",
      "size": "",
      "sku": "STRI-900203",
      "stock": 15
     }
    ],
    "mrp": 1699,
    "price": 999,
    "gst": 18,
    "hsn": "42029200",
    "countryOfOrigin": "India",
    "genericName": "Bags",
    "netQty": 1,
    "manufacturer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "packer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "importer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/stride-lab-gym-backpack.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900204,
    "sellerId": "DEMO-STRIDE",
    "vertical": "fitness-yoga-mats",
    "category": "Sports",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Stride Lab Pro Training Mat",
    "brand": "Stride Lab",
    "description": "Extra-grip 8mm mat for yoga, HIIT and stretching.",
    "features": [
     "8 mm thick",
     "Extra grip",
     "Carry strap",
     "Sweat resistant"
    ],
    "keywords": "",
    "attrs": {
     "color": "Green"
    },
    "sizeChart": {},
    "rating": 4.5,
    "variants": [
     {
      "id": "V900204-0",
      "size": "",
      "sku": "STRI-900204",
      "stock": 16
     }
    ],
    "mrp": 1099,
    "price": 649,
    "gst": 5,
    "hsn": "95069990",
    "countryOfOrigin": "India",
    "genericName": "Sports Equipment",
    "netQty": 1,
    "manufacturer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "packer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "importer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/stride-lab-pro-training-mat.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900205,
    "sellerId": "DEMO-STRIDE",
    "vertical": "fitness-dumbbells",
    "category": "Sports",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Stride Lab Hex Dumbbell Pair (2 x 3 kg)",
    "brand": "Stride Lab",
    "description": "Compact rubber hex dumbbells for home workouts.",
    "features": [
     "2 x 3 kg",
     "Rubber coated",
     "Anti-roll",
     "Ergonomic grip"
    ],
    "keywords": "",
    "attrs": {
     "color": "Black"
    },
    "sizeChart": {},
    "rating": 4.4,
    "variants": [
     {
      "id": "V900205-0",
      "size": "",
      "sku": "STRI-900205",
      "stock": 17
     }
    ],
    "mrp": 1599,
    "price": 999,
    "gst": 5,
    "hsn": "95069990",
    "countryOfOrigin": "India",
    "genericName": "Sports Equipment",
    "netQty": 1,
    "manufacturer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "packer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "importer": {
     "name": "Stride Lab Sports",
     "address": "Bengaluru, India",
     "pincode": "560034"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/stride-lab-hex-dumbbell-pair-2-x-3-kg.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   }
  ]
 },
 {
  "seller": {
   "id": "DEMO-GLOW",
   "name": "Ananya Rao",
   "shopName": "Glow Theory Beauty",
   "email": "glowtheory@demo.zzapkart.in",
   "phone": "9810000003",
   "salt": "demo-salt-2026",
   "passwordHash": "2eb6cd9078faf406bc8dee3f6317681638977a19bd674d197f895209d5c4c480",
   "demo": true,
   "kyc": {
    "status": "approved",
    "docType": "pan",
    "docNumber": "AAAPZ1002K",
    "address": "Mumbai, India – 400050",
    "addressProofType": "GST Certificate"
   },
   "profile": {
    "businessName": "Glow Theory Beauty",
    "pickup": {
     "address": "Glow Theory Beauty, Mumbai",
     "city": "Mumbai",
     "state": "",
     "pincode": "400050"
    }
   },
   "autoRenew": true,
   "adCredits": 0,
   "fssai": ""
  },
  "store": {
   "name": "Glow Theory",
   "slug": "glow-theory",
   "tagline": "Clean beauty, real results",
   "about": "Glow Theory makes clean, dermatologist-tested skincare and makeup in Mumbai. No parabens, no harsh sulphates — just ingredients that work.",
   "theme": "custom",
   "returnDays": "7",
   "logo": "images/brands/glow-theory.svg",
   "banners": [
    {
     "id": "BNR-glow-theory",
     "src": "images/banners/glow-theory.svg",
     "headline": "Your Daily Glow",
     "sub": "Clean skincare, dermatologist tested",
     "cta": "Shop now",
     "link": "all",
     "tone": "light",
     "w": 1500,
     "h": 500
    }
   ],
   "featured": [
    900301,
    900302,
    900303,
    900304
   ],
   "collections": [
    {
     "id": "C20",
     "name": "Skincare",
     "productIds": [
      900301,
      900302
     ]
    },
    {
     "id": "C21",
     "name": "Makeup",
     "productIds": [
      900303
     ]
    },
    {
     "id": "C22",
     "name": "Fragrance",
     "productIds": [
      900304
     ]
    }
   ],
   "showNew": true,
   "design": {
    "color": "#db2777",
    "font": "elegant",
    "header": "light",
    "buttons": "pill",
    "cols": 4,
    "announceOn": true,
    "announce": "Free mini serum on orders above ₹999"
   }
  },
  "listings": [
   {
    "id": 900301,
    "sellerId": "DEMO-GLOW",
    "vertical": "skin-care-face-serum",
    "category": "Beauty",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Glow Theory Vitamin C Serum 30ml",
    "brand": "Glow Theory",
    "description": "15% vitamin C with ferulic acid for brighter, more even skin.",
    "features": [
     "15% vitamin C",
     "With ferulic acid",
     "Dermatologist tested",
     "30 ml"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.5,
    "variants": [
     {
      "id": "V900301-0",
      "size": "",
      "sku": "GLOW-900301",
      "stock": 33
     }
    ],
    "mrp": 999,
    "price": 649,
    "gst": 5,
    "hsn": "33049910",
    "countryOfOrigin": "India",
    "genericName": "Personal Care",
    "netQty": 1,
    "manufacturer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "packer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "importer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/glow-theory-vitamin-c-serum-30ml.svg",
    "imageCount": 0,
    "quality": 92,
    "video": {
     "kind": "src",
     "src": "images/reels/glow-theory-vitamin-c-serum-30ml.mp4",
     "poster": "images/p/glow-theory-vitamin-c-serum-30ml.svg"
    }
   },
   {
    "id": 900302,
    "sellerId": "DEMO-GLOW",
    "vertical": "skin-care-moisturizers",
    "category": "Beauty",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Glow Theory Hydrating Day Cream",
    "brand": "Glow Theory",
    "description": "A lightweight gel-cream that hydrates for 24 hours without feeling greasy.",
    "features": [
     "24-hour hydration",
     "With ceramides",
     "Non-greasy",
     "50 g"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.3,
    "variants": [
     {
      "id": "V900302-0",
      "size": "",
      "sku": "GLOW-900302",
      "stock": 34
     }
    ],
    "mrp": 799,
    "price": 499,
    "gst": 5,
    "hsn": "33049910",
    "countryOfOrigin": "India",
    "genericName": "Personal Care",
    "netQty": 1,
    "manufacturer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "packer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "importer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/glow-theory-hydrating-day-cream.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900303,
    "sellerId": "DEMO-GLOW",
    "vertical": "makeup-lipstick",
    "category": "Beauty",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Glow Theory Velvet Matte Lipstick",
    "brand": "Glow Theory",
    "description": "A velvet-matte lipstick with 12-hour wear and a comfortable feel.",
    "features": [
     "12-hour wear",
     "Velvet matte",
     "With jojoba oil",
     "4 g"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.4,
    "variants": [
     {
      "id": "V900303-0",
      "size": "",
      "sku": "GLOW-900303",
      "stock": 35
     }
    ],
    "mrp": 699,
    "price": 449,
    "gst": 5,
    "hsn": "33049910",
    "countryOfOrigin": "India",
    "genericName": "Personal Care",
    "netQty": 1,
    "manufacturer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "packer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "importer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/glow-theory-velvet-matte-lipstick.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900304,
    "sellerId": "DEMO-GLOW",
    "vertical": "fragrances-perfumes",
    "category": "Beauty",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Glow Theory Oud Noir Perfume 50ml",
    "brand": "Glow Theory",
    "description": "A warm, woody eau de parfum with notes of oud, amber and vanilla.",
    "features": [
     "Eau de parfum",
     "Lasts 8+ hours",
     "Oud, amber, vanilla",
     "50 ml"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.6,
    "variants": [
     {
      "id": "V900304-0",
      "size": "",
      "sku": "GLOW-900304",
      "stock": 36
     }
    ],
    "mrp": 1999,
    "price": 1299,
    "gst": 5,
    "hsn": "33049910",
    "countryOfOrigin": "India",
    "genericName": "Personal Care",
    "netQty": 1,
    "manufacturer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "packer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "importer": {
     "name": "Glow Theory Beauty",
     "address": "Mumbai, India",
     "pincode": "400050"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/glow-theory-oud-noir-perfume-50ml.svg",
    "imageCount": 0,
    "quality": 92,
    "video": {
     "kind": "src",
     "src": "images/reels/glow-theory-oud-noir-perfume-50ml.mp4",
     "poster": "images/p/glow-theory-oud-noir-perfume-50ml.svg"
    }
   }
  ]
 },
 {
  "seller": {
   "id": "DEMO-NEST",
   "name": "Farhan Sheikh",
   "shopName": "Nestwell Home Decor",
   "email": "nestwell@demo.zzapkart.in",
   "phone": "9810000004",
   "salt": "demo-salt-2026",
   "passwordHash": "2eb6cd9078faf406bc8dee3f6317681638977a19bd674d197f895209d5c4c480",
   "demo": true,
   "kyc": {
    "status": "approved",
    "docType": "pan",
    "docNumber": "AAAPZ1003K",
    "address": "Jaipur, India – 302015",
    "addressProofType": "GST Certificate"
   },
   "profile": {
    "businessName": "Nestwell Home Decor",
    "pickup": {
     "address": "Nestwell Home Decor, Jaipur",
     "city": "Jaipur",
     "state": "",
     "pincode": "302015"
    }
   },
   "autoRenew": true,
   "adCredits": 0,
   "fssai": ""
  },
  "store": {
   "name": "Nestwell Home",
   "slug": "nestwell-home",
   "tagline": "Make every corner feel like home",
   "about": "Nestwell is a Jaipur-based home studio. We design lamps, clocks and soft furnishings in small batches, inspired by Rajasthani colours and modern living.",
   "theme": "custom",
   "returnDays": "7",
   "logo": "images/brands/nestwell-home.svg",
   "banners": [
    {
     "id": "BNR-nestwell-home",
     "src": "images/banners/nestwell-home.svg",
     "headline": "Cosy Corners",
     "sub": "Lamps, clocks and soft furnishings",
     "cta": "Shop now",
     "link": "all",
     "tone": "light",
     "w": 1500,
     "h": 500
    }
   ],
   "featured": [
    900401,
    900402,
    900403,
    900404
   ],
   "collections": [
    {
     "id": "C30",
     "name": "Lighting",
     "productIds": [
      900401
     ]
    },
    {
     "id": "C31",
     "name": "Decor",
     "productIds": [
      900402,
      900403,
      900404
     ]
    },
    {
     "id": "C32",
     "name": "Kitchen",
     "productIds": [
      900405
     ]
    }
   ],
   "showNew": true,
   "design": {
    "color": "#0f766e",
    "font": "classic",
    "header": "brand",
    "buttons": "rounded",
    "cols": 4,
    "announceOn": true,
    "announce": "Festive home edit — new lamps and cushions"
   }
  },
  "listings": [
   {
    "id": 900401,
    "sellerId": "DEMO-NEST",
    "vertical": "home-decor-lamps-and-lights",
    "category": "Home",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Nestwell Ceramic Table Lamp",
    "brand": "Nestwell Home",
    "description": "A glazed ceramic lamp with a linen shade that casts a warm glow.",
    "features": [
     "Glazed ceramic base",
     "Linen shade",
     "E27 holder",
     "Height 42 cm"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.5,
    "variants": [
     {
      "id": "V900401-0",
      "size": "",
      "sku": "NEST-900401",
      "stock": 13
     }
    ],
    "mrp": 1999,
    "price": 1299,
    "gst": 5,
    "hsn": "91052100",
    "countryOfOrigin": "India",
    "genericName": "Home Decor",
    "netQty": 1,
    "manufacturer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "packer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "importer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/nestwell-ceramic-table-lamp.svg",
    "imageCount": 0,
    "quality": 92,
    "video": {
     "kind": "src",
     "src": "images/reels/nestwell-ceramic-table-lamp.mp4",
     "poster": "images/p/nestwell-ceramic-table-lamp.svg"
    }
   },
   {
    "id": 900402,
    "sellerId": "DEMO-NEST",
    "vertical": "home-decor-wall-clocks",
    "category": "Home",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Nestwell Minimal Wall Clock",
    "brand": "Nestwell Home",
    "description": "A silent-sweep wall clock with a clean, minimal dial.",
    "features": [
     "Silent sweep movement",
     "30 cm diameter",
     "Metal frame",
     "Uses 1 AA battery"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.3,
    "variants": [
     {
      "id": "V900402-0",
      "size": "",
      "sku": "NEST-900402",
      "stock": 14
     }
    ],
    "mrp": 1399,
    "price": 899,
    "gst": 5,
    "hsn": "91052100",
    "countryOfOrigin": "India",
    "genericName": "Home Decor",
    "netQty": 1,
    "manufacturer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "packer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "importer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/nestwell-minimal-wall-clock.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900403,
    "sellerId": "DEMO-NEST",
    "vertical": "home-furnishing-cushion-covers",
    "category": "Home",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Nestwell Boho Cushion Covers (Set of 2)",
    "brand": "Nestwell Home",
    "description": "Hand-printed cotton cushion covers in warm desert tones.",
    "features": [
     "100% cotton",
     "16 x 16 inches",
     "Hidden zip",
     "Set of 2"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.4,
    "variants": [
     {
      "id": "V900403-0",
      "size": "",
      "sku": "NEST-900403",
      "stock": 15
     }
    ],
    "mrp": 999,
    "price": 599,
    "gst": 5,
    "hsn": "63022100",
    "countryOfOrigin": "India",
    "genericName": "Home Furnishing",
    "netQty": 1,
    "manufacturer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "packer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "importer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/nestwell-boho-cushion-covers-set-of-2.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900404,
    "sellerId": "DEMO-NEST",
    "vertical": "home-decor-artificial-plants",
    "category": "Home",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Nestwell Faux Monstera Plant",
    "brand": "Nestwell Home",
    "description": "A lifelike faux plant that stays green with zero care.",
    "features": [
     "Lifelike leaves",
     "Ceramic pot",
     "No watering",
     "Height 45 cm"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.2,
    "variants": [
     {
      "id": "V900404-0",
      "size": "",
      "sku": "NEST-900404",
      "stock": 16
     }
    ],
    "mrp": 1199,
    "price": 749,
    "gst": 5,
    "hsn": "91052100",
    "countryOfOrigin": "India",
    "genericName": "Home Decor",
    "netQty": 1,
    "manufacturer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "packer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "importer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/nestwell-faux-monstera-plant.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900405,
    "sellerId": "DEMO-NEST",
    "vertical": "kitchen-and-dining-water-bottles-and-flasks",
    "category": "Home",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Nestwell Insulated Flask 750ml",
    "brand": "Nestwell Home",
    "description": "Vacuum-insulated steel flask that keeps drinks hot or cold for hours.",
    "features": [
     "750 ml",
     "Hot 12 h / cold 24 h",
     "Leak proof",
     "Steel body"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.5,
    "variants": [
     {
      "id": "V900405-0",
      "size": "",
      "sku": "NEST-900405",
      "stock": 17
     }
    ],
    "mrp": 1099,
    "price": 699,
    "gst": 5,
    "hsn": "73239390",
    "countryOfOrigin": "India",
    "genericName": "Kitchen & Dining",
    "netQty": 1,
    "manufacturer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "packer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "importer": {
     "name": "Nestwell Home Decor",
     "address": "Jaipur, India",
     "pincode": "302015"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/nestwell-insulated-flask-750ml.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   }
  ]
 },
 {
  "seller": {
   "id": "DEMO-CHAI",
   "name": "Meera Bora",
   "shopName": "Chai Chronicles Foods",
   "email": "chaichronicles@demo.zzapkart.in",
   "phone": "9810000005",
   "salt": "demo-salt-2026",
   "passwordHash": "2eb6cd9078faf406bc8dee3f6317681638977a19bd674d197f895209d5c4c480",
   "demo": true,
   "kyc": {
    "status": "approved",
    "docType": "pan",
    "docNumber": "AAAPZ1004K",
    "address": "Guwahati, India – 781005",
    "addressProofType": "GST Certificate"
   },
   "profile": {
    "businessName": "Chai Chronicles Foods",
    "pickup": {
     "address": "Chai Chronicles Foods, Guwahati",
     "city": "Guwahati",
     "state": "",
     "pincode": "781005"
    }
   },
   "autoRenew": true,
   "adCredits": 0,
   "fssai": "10019022000123"
  },
  "store": {
   "name": "Chai Chronicles",
   "slug": "chai-chronicles",
   "tagline": "Garden-fresh teas and pantry staples",
   "about": "Chai Chronicles sources tea directly from family-run gardens in Assam and Darjeeling, and blends spices the way our grandmother did. Fresh, honest, and full of flavour.",
   "theme": "custom",
   "returnDays": "7",
   "logo": "images/brands/chai-chronicles.svg",
   "banners": [
    {
     "id": "BNR-chai-chronicles",
     "src": "images/banners/chai-chronicles.svg",
     "headline": "Brewed with Love",
     "sub": "Direct from Assam and Darjeeling gardens",
     "cta": "Shop now",
     "link": "all",
     "tone": "light",
     "w": 1500,
     "h": 500
    }
   ],
   "featured": [
    900501,
    900502,
    900503,
    900504
   ],
   "collections": [
    {
     "id": "C40",
     "name": "Teas",
     "productIds": [
      900501,
      900502
     ]
    },
    {
     "id": "C41",
     "name": "Pantry",
     "productIds": [
      900503,
      900504,
      900505
     ]
    }
   ],
   "showNew": true,
   "design": {
    "color": "#166534",
    "font": "friendly",
    "header": "light",
    "buttons": "rounded",
    "cols": 4,
    "announceOn": true,
    "announce": "Fresh first flush has arrived"
   }
  },
  "listings": [
   {
    "id": 900501,
    "sellerId": "DEMO-CHAI",
    "vertical": "beverages-tea",
    "category": "Grocery",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Chai Chronicles Masala Chai 250g",
    "brand": "Chai Chronicles",
    "description": "Strong Assam tea blended with cardamom, ginger and cinnamon.",
    "features": [
     "250 g",
     "Real spices",
     "No added flavours",
     "Makes 125 cups"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.7,
    "variants": [
     {
      "id": "V900501-0",
      "size": "",
      "sku": "CHAI-900501",
      "stock": 33
     }
    ],
    "mrp": 399,
    "price": 299,
    "gst": 0,
    "hsn": "09024020",
    "countryOfOrigin": "India",
    "genericName": "Grocery",
    "netQty": 1,
    "manufacturer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "packer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "importer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/chai-chronicles-masala-chai-250g.svg",
    "imageCount": 0,
    "quality": 92,
    "video": {
     "kind": "src",
     "src": "images/reels/chai-chronicles-masala-chai-250g.mp4",
     "poster": "images/p/chai-chronicles-masala-chai-250g.svg"
    }
   },
   {
    "id": 900502,
    "sellerId": "DEMO-CHAI",
    "vertical": "beverages-tea",
    "category": "Grocery",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Chai Chronicles Darjeeling First Flush 100g",
    "brand": "Chai Chronicles",
    "description": "Delicate, floral first-flush leaves from a single Darjeeling estate.",
    "features": [
     "100 g whole leaf",
     "Single estate",
     "Floral and light",
     "Best without milk"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.6,
    "variants": [
     {
      "id": "V900502-0",
      "size": "",
      "sku": "CHAI-900502",
      "stock": 34
     }
    ],
    "mrp": 599,
    "price": 449,
    "gst": 0,
    "hsn": "09024020",
    "countryOfOrigin": "India",
    "genericName": "Grocery",
    "netQty": 1,
    "manufacturer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "packer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "importer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/chai-chronicles-darjeeling-first-flush-100g.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900503,
    "sellerId": "DEMO-CHAI",
    "vertical": "pickles-and-spreads-honey",
    "category": "Grocery",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Chai Chronicles Raw Forest Honey 350g",
    "brand": "Chai Chronicles",
    "description": "Unfiltered honey from wild forest hives in the North-East.",
    "features": [
     "350 g",
     "Raw and unfiltered",
     "No added sugar",
     "Glass jar"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.5,
    "variants": [
     {
      "id": "V900503-0",
      "size": "",
      "sku": "CHAI-900503",
      "stock": 35
     }
    ],
    "mrp": 429,
    "price": 329,
    "gst": 0,
    "hsn": "09024020",
    "countryOfOrigin": "India",
    "genericName": "Grocery",
    "netQty": 1,
    "manufacturer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "packer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "importer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/chai-chronicles-raw-forest-honey-350g.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900504,
    "sellerId": "DEMO-CHAI",
    "vertical": "spices-and-masalas-blended-masalas",
    "category": "Grocery",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Chai Chronicles Garam Masala 100g",
    "brand": "Chai Chronicles",
    "description": "Hand-roasted whole spices, freshly ground in small batches.",
    "features": [
     "100 g",
     "Small-batch roasted",
     "No fillers",
     "Resealable jar"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.4,
    "variants": [
     {
      "id": "V900504-0",
      "size": "",
      "sku": "CHAI-900504",
      "stock": 36
     }
    ],
    "mrp": 199,
    "price": 149,
    "gst": 0,
    "hsn": "09024020",
    "countryOfOrigin": "India",
    "genericName": "Grocery",
    "netQty": 1,
    "manufacturer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "packer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "importer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/chai-chronicles-garam-masala-100g.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900505,
    "sellerId": "DEMO-CHAI",
    "vertical": "dry-fruits-and-nuts-mixed-dry-fruits",
    "category": "Grocery",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Chai Chronicles Dry Fruit Mix 500g",
    "brand": "Chai Chronicles",
    "description": "Almonds, cashews, raisins and walnuts — a healthy everyday snack.",
    "features": [
     "500 g",
     "4 premium nuts",
     "Zip-lock pouch",
     "No added salt"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.5,
    "variants": [
     {
      "id": "V900505-0",
      "size": "",
      "sku": "CHAI-900505",
      "stock": 37
     }
    ],
    "mrp": 899,
    "price": 699,
    "gst": 0,
    "hsn": "09024020",
    "countryOfOrigin": "India",
    "genericName": "Grocery",
    "netQty": 1,
    "manufacturer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "packer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "importer": {
     "name": "Chai Chronicles Foods",
     "address": "Guwahati, India",
     "pincode": "781005"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/chai-chronicles-dry-fruit-mix-500g.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   }
  ]
 },
 {
  "seller": {
   "id": "DEMO-PIXEL",
   "name": "Arjun Nair",
   "shopName": "Pixel Pulse Electronics",
   "email": "pixelpulse@demo.zzapkart.in",
   "phone": "9810000006",
   "salt": "demo-salt-2026",
   "passwordHash": "2eb6cd9078faf406bc8dee3f6317681638977a19bd674d197f895209d5c4c480",
   "demo": true,
   "kyc": {
    "status": "approved",
    "docType": "pan",
    "docNumber": "AAAPZ1005K",
    "address": "Pune, India – 411014",
    "addressProofType": "GST Certificate"
   },
   "profile": {
    "businessName": "Pixel Pulse Electronics",
    "pickup": {
     "address": "Pixel Pulse Electronics, Pune",
     "city": "Pune",
     "state": "",
     "pincode": "411014"
    }
   },
   "autoRenew": true,
   "adCredits": 0,
   "fssai": ""
  },
  "store": {
   "name": "Pixel Pulse",
   "slug": "pixel-pulse",
   "tagline": "Smart gadgets for everyday life",
   "about": "Pixel Pulse designs audio and wearables in Pune. We obsess over sound, battery life and comfort — and back every product with a 1-year warranty.",
   "theme": "custom",
   "returnDays": "7",
   "logo": "images/brands/pixel-pulse.svg",
   "banners": [
    {
     "id": "BNR-pixel-pulse",
     "src": "images/banners/pixel-pulse.svg",
     "headline": "Sound, Upgraded",
     "sub": "ANC earbuds, speakers and smart watches",
     "cta": "Shop now",
     "link": "all",
     "tone": "light",
     "w": 1500,
     "h": 500
    }
   ],
   "featured": [
    900601,
    900602,
    900603,
    900604
   ],
   "collections": [
    {
     "id": "C50",
     "name": "Audio",
     "productIds": [
      900601,
      900602,
      900605
     ]
    },
    {
     "id": "C51",
     "name": "Wearables",
     "productIds": [
      900603,
      900604
     ]
    }
   ],
   "showNew": true,
   "design": {
    "color": "#7c3aed",
    "font": "poppins",
    "header": "dark",
    "buttons": "rounded",
    "cols": 4,
    "announceOn": true,
    "announce": "1-year warranty on every gadget"
   }
  },
  "listings": [
   {
    "id": 900601,
    "sellerId": "DEMO-PIXEL",
    "vertical": "audio-true-wireless-earbuds",
    "category": "Electronics",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Pixel Pulse Buds Air ANC Earbuds",
    "brand": "Pixel Pulse",
    "description": "Active noise cancellation, 40-hour battery and low-latency gaming mode.",
    "features": [
     "Active noise cancellation",
     "40-hour total battery",
     "Low-latency game mode",
     "IPX5"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.4,
    "variants": [
     {
      "id": "V900601-0",
      "size": "",
      "sku": "PIXE-900601",
      "stock": 13
     }
    ],
    "mrp": 3999,
    "price": 1999,
    "gst": 18,
    "hsn": "85183000",
    "countryOfOrigin": "India",
    "genericName": "Electronics",
    "netQty": 1,
    "manufacturer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "packer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "importer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/pixel-pulse-buds-air-anc-earbuds.svg",
    "imageCount": 0,
    "quality": 92,
    "video": {
     "kind": "src",
     "src": "images/reels/pixel-pulse-buds-air-anc-earbuds.mp4",
     "poster": "images/p/pixel-pulse-buds-air-anc-earbuds.svg"
    }
   },
   {
    "id": 900602,
    "sellerId": "DEMO-PIXEL",
    "vertical": "audio-bluetooth-speakers",
    "category": "Electronics",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Pixel Pulse Boom Mini Speaker",
    "brand": "Pixel Pulse",
    "description": "Pocket-sized speaker with punchy bass and RGB lights.",
    "features": [
     "10W output",
     "RGB lights",
     "10-hour playtime",
     "IPX7"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.3,
    "variants": [
     {
      "id": "V900602-0",
      "size": "",
      "sku": "PIXE-900602",
      "stock": 14
     }
    ],
    "mrp": 2199,
    "price": 1299,
    "gst": 18,
    "hsn": "85183000",
    "countryOfOrigin": "India",
    "genericName": "Electronics",
    "netQty": 1,
    "manufacturer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "packer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "importer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/pixel-pulse-boom-mini-speaker.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900603,
    "sellerId": "DEMO-PIXEL",
    "vertical": "wearables-smart-watches",
    "category": "Electronics",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Pixel Pulse Fit 3 Smart Watch",
    "brand": "Pixel Pulse",
    "description": "Bluetooth calling, health tracking and a bright 1.96\" display.",
    "features": [
     "Bluetooth calling",
     "SpO2 and heart rate",
     "1.96\" display",
     "10-day battery"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.2,
    "variants": [
     {
      "id": "V900603-0",
      "size": "",
      "sku": "PIXE-900603",
      "stock": 15
     }
    ],
    "mrp": 4499,
    "price": 2499,
    "gst": 18,
    "hsn": "85183000",
    "countryOfOrigin": "India",
    "genericName": "Electronics",
    "netQty": 1,
    "manufacturer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "packer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "importer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/pixel-pulse-fit-3-smart-watch.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900604,
    "sellerId": "DEMO-PIXEL",
    "vertical": "mobile-accessories-power-banks",
    "category": "Electronics",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Pixel Pulse 20000mAh Power Bank",
    "brand": "Pixel Pulse",
    "description": "22.5W fast charging power bank that charges a phone up to 4 times.",
    "features": [
     "20000 mAh",
     "22.5W fast charging",
     "USB-C in/out",
     "LED indicator"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.5,
    "variants": [
     {
      "id": "V900604-0",
      "size": "",
      "sku": "PIXE-900604",
      "stock": 16
     }
    ],
    "mrp": 1999,
    "price": 1199,
    "gst": 18,
    "hsn": "39269099",
    "countryOfOrigin": "India",
    "genericName": "Mobile Accessories",
    "netQty": 1,
    "manufacturer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "packer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "importer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/pixel-pulse-20000mah-power-bank.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900605,
    "sellerId": "DEMO-PIXEL",
    "vertical": "audio-headphones",
    "category": "Electronics",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Pixel Pulse Studio Headphones",
    "brand": "Pixel Pulse",
    "description": "Studio-tuned over-ear headphones with plush cushions and 50-hour battery.",
    "features": [
     "40 mm drivers",
     "50-hour battery",
     "Foldable",
     "Wired + wireless"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.6,
    "variants": [
     {
      "id": "V900605-0",
      "size": "",
      "sku": "PIXE-900605",
      "stock": 17
     }
    ],
    "mrp": 4999,
    "price": 2999,
    "gst": 18,
    "hsn": "85183000",
    "countryOfOrigin": "India",
    "genericName": "Electronics",
    "netQty": 1,
    "manufacturer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "packer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "importer": {
     "name": "Pixel Pulse Electronics",
     "address": "Pune, India",
     "pincode": "411014"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/pixel-pulse-studio-headphones.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   }
  ]
 },
 {
  "seller": {
   "id": "DEMO-SPROUT",
   "name": "Neha Kapoor",
   "shopName": "Little Sprouts Toys",
   "email": "littlesprouts@demo.zzapkart.in",
   "phone": "9810000007",
   "salt": "demo-salt-2026",
   "passwordHash": "2eb6cd9078faf406bc8dee3f6317681638977a19bd674d197f895209d5c4c480",
   "demo": true,
   "kyc": {
    "status": "approved",
    "docType": "pan",
    "docNumber": "AAAPZ1006K",
    "address": "Chandigarh, India – 160017",
    "addressProofType": "GST Certificate"
   },
   "profile": {
    "businessName": "Little Sprouts Toys",
    "pickup": {
     "address": "Little Sprouts Toys, Chandigarh",
     "city": "Chandigarh",
     "state": "",
     "pincode": "160017"
    }
   },
   "autoRenew": true,
   "adCredits": 0,
   "fssai": ""
  },
  "store": {
   "name": "Little Sprouts",
   "slug": "little-sprouts",
   "tagline": "Safe, joyful toys for little ones",
   "about": "Little Sprouts makes safe, non-toxic toys that spark imagination. Every toy is tested for safety and designed with parents and teachers.",
   "theme": "custom",
   "returnDays": "7",
   "logo": "images/brands/little-sprouts.svg",
   "banners": [
    {
     "id": "BNR-little-sprouts",
     "src": "images/banners/little-sprouts.svg",
     "headline": "Play. Learn. Grow.",
     "sub": "Safe, non-toxic toys for ages 1+",
     "cta": "Shop now",
     "link": "all",
     "tone": "light",
     "w": 1500,
     "h": 500
    }
   ],
   "featured": [
    900701,
    900702,
    900703
   ],
   "collections": [
    {
     "id": "C60",
     "name": "Soft Toys",
     "productIds": [
      900701
     ]
    },
    {
     "id": "C61",
     "name": "Learning",
     "productIds": [
      900702,
      900703
     ]
    }
   ],
   "showNew": true,
   "design": {
    "color": "#f59e0b",
    "font": "friendly",
    "header": "light",
    "buttons": "pill",
    "cols": 4,
    "announceOn": true,
    "announce": "Gift wrapping free on all toys"
   }
  },
  "listings": [
   {
    "id": 900701,
    "sellerId": "DEMO-SPROUT",
    "vertical": "toys-and-games-soft-toys",
    "category": "Toys",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Little Sprouts Plush Teddy",
    "brand": "Little Sprouts",
    "description": "An extra-soft teddy with embroidered eyes — safe for babies.",
    "features": [
     "Embroidered eyes",
     "Hypoallergenic filling",
     "35 cm",
     "Ages 0+"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.7,
    "variants": [
     {
      "id": "V900701-0",
      "size": "",
      "sku": "LITT-900701",
      "stock": 33
     }
    ],
    "mrp": 1099,
    "price": 699,
    "gst": 5,
    "hsn": "95030010",
    "countryOfOrigin": "India",
    "genericName": "Toys",
    "netQty": 1,
    "manufacturer": {
     "name": "Little Sprouts Toys",
     "address": "Chandigarh, India",
     "pincode": "160017"
    },
    "packer": {
     "name": "Little Sprouts Toys",
     "address": "Chandigarh, India",
     "pincode": "160017"
    },
    "importer": {
     "name": "Little Sprouts Toys",
     "address": "Chandigarh, India",
     "pincode": "160017"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/little-sprouts-plush-teddy.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900702,
    "sellerId": "DEMO-SPROUT",
    "vertical": "toys-and-games-building-blocks",
    "category": "Toys",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Little Sprouts Stacking Blocks",
    "brand": "Little Sprouts",
    "description": "Chunky letter blocks for stacking, sorting and early learning.",
    "features": [
     "20 blocks",
     "Non-toxic colours",
     "Rounded edges",
     "Ages 1+"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.5,
    "variants": [
     {
      "id": "V900702-0",
      "size": "",
      "sku": "LITT-900702",
      "stock": 34
     }
    ],
    "mrp": 899,
    "price": 549,
    "gst": 5,
    "hsn": "95030010",
    "countryOfOrigin": "India",
    "genericName": "Toys",
    "netQty": 1,
    "manufacturer": {
     "name": "Little Sprouts Toys",
     "address": "Chandigarh, India",
     "pincode": "160017"
    },
    "packer": {
     "name": "Little Sprouts Toys",
     "address": "Chandigarh, India",
     "pincode": "160017"
    },
    "importer": {
     "name": "Little Sprouts Toys",
     "address": "Chandigarh, India",
     "pincode": "160017"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "1",
    "fulfilment": "seller",
    "image": "images/p/little-sprouts-stacking-blocks.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   },
   {
    "id": 900703,
    "sellerId": "DEMO-SPROUT",
    "vertical": "toys-and-games-remote-control-toys",
    "category": "Toys",
    "status": "qc_passed",
    "listingStatus": "active",
    "demo": true,
    "name": "Little Sprouts Mini Racer Car",
    "brand": "Little Sprouts",
    "description": "A friction-powered mini racer with chunky wheels.",
    "features": [
     "Friction powered",
     "Chunky wheels",
     "No batteries",
     "Ages 3+"
    ],
    "keywords": "",
    "attrs": {},
    "sizeChart": {},
    "rating": 4.3,
    "variants": [
     {
      "id": "V900703-0",
      "size": "",
      "sku": "LITT-900703",
      "stock": 35
     }
    ],
    "mrp": 599,
    "price": 349,
    "gst": 5,
    "hsn": "95030010",
    "countryOfOrigin": "India",
    "genericName": "Toys",
    "netQty": 1,
    "manufacturer": {
     "name": "Little Sprouts Toys",
     "address": "Chandigarh, India",
     "pincode": "160017"
    },
    "packer": {
     "name": "Little Sprouts Toys",
     "address": "Chandigarh, India",
     "pincode": "160017"
    },
    "importer": {
     "name": "Little Sprouts Toys",
     "address": "Chandigarh, India",
     "pincode": "160017"
    },
    "pkg": {
     "l": 30,
     "b": 22,
     "h": 6,
     "w": 400
    },
    "sla": "2",
    "fulfilment": "seller",
    "image": "images/p/little-sprouts-mini-racer-car.svg",
    "imageCount": 0,
    "quality": 92,
    "video": null
   }
  ]
 }
];
