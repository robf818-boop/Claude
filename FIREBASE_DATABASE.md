# Firebase Database Structure for UnitIQ

## Simplified Model-Based Approach

UnitIQ uses a **model-based lookup system** - you only need to add each HVAC model type once, not every individual unit.

## Database Path
```
/artifacts/unitiq-enterprise-v1/public/data/models/{MODEL_NUMBER}
/artifacts/unitiq-enterprise-v1/public/data/orders/{ORDER_ID}
```

## How Many Models Do You Need?

Instead of millions of individual units, you only need:
- **100-500 total models** across all brands you service
- Common residential models (Carrier, Trane, Lennox, etc.)
- When a tech scans serial `2620E31113`, the app looks up model `186CNVO24000FAAA` and shows its data

---

## Model Document Structure

### Collection: `models`
### Document ID: Model Number (uppercase)

```json
{
  "model": "186CNVO24000FAAA",
  "brand": "Carrier",
  "productName": "EVOLUTION EXTREME CONDENSING UNIT, VARIABLE SPEED AC, 208/230-1-60",
  "diagramUrl": "https://your-storage.com/diagrams/carrier-186cnvo24000faaa.png",

  "parts": [
    {
      "id": "part-1",
      "number": "1",
      "name": "Compressor",
      "oemPartNumber": "06EA660362",
      "substitutions": ["06EA660362-R", "COMP-ALT-001"],
      "oemCost": 1250.00,
      "retailPrice": 9375.00,
      "category": "compressor",
      "diagramPosition": {
        "top": "72%",
        "left": "35%"
      }
    },
    {
      "id": "part-2",
      "number": "2",
      "name": "Condenser Fan Motor",
      "oemPartNumber": "HC39GE237",
      "substitutions": ["HC39GE237A", "FAN-MTR-002"],
      "oemCost": 245.00,
      "retailPrice": 2450.00,
      "category": "motor",
      "diagramPosition": {
        "top": "22%",
        "left": "52%"
      }
    },
    {
      "id": "part-3",
      "number": "3",
      "name": "Control Board",
      "oemPartNumber": "HK61EA006",
      "substitutions": ["HK61EA006-REV2"],
      "oemCost": 385.00,
      "retailPrice": 2887.50,
      "category": "control",
      "diagramPosition": {
        "top": "45%",
        "left": "78%"
      }
    },
    {
      "id": "part-4",
      "number": "4",
      "name": "Dual Capacitor 45/5 MFD",
      "oemPartNumber": "P291-4553RS",
      "substitutions": ["CAP-45/5-370", "TURBO-200"],
      "oemCost": 42.00,
      "retailPrice": 420.00,
      "category": "electrical"
    }
  ],

  "troubleshooting": {
    "part-1": [
      {
        "id": 0,
        "question": "Is the compressor running but not cooling?",
        "yesNext": 1,
        "noNext": 2
      },
      {
        "id": 1,
        "question": "Is the suction line warm or hot?",
        "yesNext": 3,
        "noNext": 4
      },
      {
        "id": 2,
        "question": "Do you hear a humming sound from the compressor?",
        "yesNext": 5,
        "noNext": 6
      },
      {
        "id": 3,
        "question": null,
        "action": "Low refrigerant charge detected. Check for leaks before replacing compressor."
      },
      {
        "id": 4,
        "question": null,
        "action": "Compressor failure likely. Check amp draw and verify with specs. Replace if confirmed."
      },
      {
        "id": 5,
        "question": null,
        "action": "Compressor locked rotor. Check capacitor first. If capacitor OK, replace compressor."
      },
      {
        "id": 6,
        "question": null,
        "action": "Check electrical connections and contactor. If OK, compressor may have open windings."
      }
    ],
    "part-2": [
      {
        "id": 0,
        "question": "Is the fan motor not spinning at all?",
        "yesNext": 1,
        "noNext": 2
      },
      {
        "id": 1,
        "question": "Can you manually spin the fan blade freely?",
        "yesNext": 3,
        "noNext": 4
      },
      {
        "id": 2,
        "question": "Is the fan making unusual noise or vibrating?",
        "yesNext": 5,
        "noNext": 6
      },
      {
        "id": 3,
        "question": null,
        "action": "Motor failure. Check capacitor first. If capacitor is good, replace motor."
      },
      {
        "id": 4,
        "question": null,
        "action": "Seized bearing. Replace motor immediately to prevent further damage."
      },
      {
        "id": 5,
        "question": null,
        "action": "Bearing wear detected. Motor replacement recommended. Check blade balance."
      },
      {
        "id": 6,
        "question": null,
        "action": "Check for loose mounting or debris. If clear, check capacitor and voltage."
      }
    ]
  },

  "literatureUrls": {
    "installation": "https://www.carrier.com/residential/en/us/products/air-conditioners/installation/",
    "diagnostic": "https://www.carrier.com/residential/en/us/products/air-conditioners/service/",
    "productData": "https://www.carrier.com/residential/en/us/products/air-conditioners/",
    "serviceBulletins": "https://www.carrier.com/residential/en/us/service-bulletins/"
  }
}
```

---

## Part Categories

Use consistent categories across all models:
- `compressor`
- `motor`
- `coil`
- `control`
- `electrical`
- `refrigeration`
- `fan`
- `valve`

---

## Diagram Positions

For `diagramPosition`, use percentage values:
- **top**: Percentage from top (e.g., `"72%"`)
- **left**: Percentage from left (e.g., `"35%"`)

These create clickable hotspots on the exploded diagram image.

---

## Troubleshooting Flowcharts

Each troubleshooting flow is a **decision tree**:
- Each step has a `question`
- `yesNext` points to the next step ID if answer is "yes"
- `noNext` points to the next step ID if answer is "no"
- When there's no next step, provide an `action` (final recommendation)

---

## Orders Collection

### Collection: `orders`
### Document ID: Auto-generated

```json
{
  "unitSerial": "2620E31113",
  "unitModel": "186CNVO24000FAAA",
  "techUid": "firebase-user-id",
  "techName": "Field Tech",
  "createdAt": {
    "seconds": 1705276800,
    "nanoseconds": 0
  },
  "status": "pending",
  "urgent": false,
  "parts": [
    {
      "id": "part-1",
      "number": "1",
      "name": "Compressor",
      "oemPartNumber": "06EA660362",
      "substitutions": ["06EA660362-R"],
      "oemCost": 1250.00,
      "retailPrice": 9375.00,
      "category": "compressor",
      "quantity": 1,
      "notes": "Customer reports unit not cooling"
    }
  ]
}
```

---

## How to Add Models to Firebase

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select Project**: `unitiq-enterprise`
3. **Navigate**: Firestore Database
4. **Create Path**: `artifacts/unitiq-enterprise-v1/public/data/models`
5. **Add Document**:
   - Document ID: Model number (e.g., `186CNVO24000FAAA`)
   - Fields: Copy structure above

---

## Where to Get Model Data

### 1. **Manufacturer Websites**
- **Carrier**: https://www.carrier.com/residential/en/us/products/
- **Trane**: https://www.trane.com/residential/en/products/
- **Lennox**: https://www.lennox.com/products/
- **Rheem**: https://www.rheem.com/products/
- **Goodman**: https://www.goodmanmfg.com/products

Download:
- Service manuals (has parts lists)
- Installation manuals (has diagrams)
- Product data sheets

### 2. **Your Parts Distributor**
Most HVAC distributors have:
- Online catalogs with part numbers
- Cross-reference guides (OEM → substitutions)
- Pricing (for your account)

### 3. **Parts Websites**
- **PartsAPS**: https://www.partsaps.com/
- **HVAC Parts Shop**: https://www.hvacpartsshop.com/
- **SupplyHouse**: https://www.supplyhouse.com/

---

## Example Workflow

**Tech in the field:**
1. Arrives at service call
2. Opens UnitIQ app
3. Scans data plate barcode: `2620E31113`
4. App looks up model `186CNVO24000FAAA`
5. Shows: Parts list, diagram, troubleshooting, manuals
6. Diagnoses compressor issue using flowchart
7. Adds compressor to parts order
8. Submits order to office

**Office staff:**
1. Opens UnitIQ in "Office View"
2. Sees new order from tech
3. Clicks "Export to Excel"
4. Opens Excel file with: part numbers, quantities, pricing
5. Places order with distributor
6. Updates order status to "ordered"

---

## Quick Start: Add Your First Model

Let's add **Carrier 24ABC636A003** (a common 3-ton unit):

1. Go to Firestore Console
2. Navigate to: `artifacts/unitiq-enterprise-v1/public/data/models`
3. Click "Add Document"
4. Document ID: `24ABC636A003`
5. Add fields:
   ```
   model: "24ABC636A003"
   brand: "Carrier"
   productName: "Comfort Series Air Conditioner, 14 SEER, 3 Ton"
   diagramUrl: ""  (leave empty for now)
   parts: [] (empty array for now)
   troubleshooting: {} (empty object)
   literatureUrls: {
     installation: "https://www.carrier.com/residential/en/us/products/air-conditioners/"
   }
   ```
6. Save
7. Test: Search `24ABC636A003` in the app

Then gradually add parts, diagrams, and troubleshooting as you have time!

---

## Storage for Diagram Images

Upload exploded diagram images to:
- **Firebase Storage** (recommended)
- **AWS S3**
- **Cloudinary**
- Any public CDN

Then put the public URL in the `diagramUrl` field.

---

## Need Help?

The app currently stores all data in Firebase. As you grow, you might want:
- Manufacturer API integration (Carrier, Trane APIs)
- Parts database service (HVAC Brain, ADP)
- Distributor API integration

But start simple - manually add your top 50 models and you'll cover 80% of your service calls!
