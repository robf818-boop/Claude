# Firebase Database Structure for UnitIQ

## Overview
UnitIQ stores HVAC unit data in Firebase Firestore. Each unit is indexed by its serial number for fast lookup.

## Database Path
```
/artifacts/{appId}/public/data/units/{SERIAL_NUMBER}
/artifacts/{appId}/public/data/orders/{ORDER_ID}
```

Where `{appId}` is `unitiq-enterprise-v1`

## Unit Document Structure

### Collection: `units`
### Document ID: Unit Serial Number (uppercase)

```json
{
  "serial": "2620E31113",
  "model": "186CNVO24000FAAA",
  "brand": "Carrier",
  "productName": "EVOLUTION EXTREME CONDENSING UNIT, VARIABLE SPEED AC, 208/230-1-60",
  "installDate": "10/01/2020",
  "shippedDate": "09/09/2020",
  "owner": "S**************n",
  "dateTransferred": "N/A",
  "warrantyPolicy": "The Unit Replacement limited warranty applies only if the following conditions are met: a. Claimant is the original purchaser of the product; b. A Carrier outdoor unit must be installed in combination with a matching indoor coil, the combination must be certified and listed in the AHRI Unitary Directory of Certified Products (AHRI = Air-Conditioning, Heating, and Refrigeration Institute); c. The supplied filter-drier must be installed per the installation instructions.",
  "warrantyStatus": "Active",
  "diagramUrl": "https://example.com/diagrams/carrier-186CNVO24000FAAA.png",

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
      "warrantyEligible": true,
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
      "warrantyEligible": true,
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
      "warrantyEligible": true,
      "diagramPosition": {
        "top": "45%",
        "left": "78%"
      }
    },
    {
      "id": "part-4",
      "number": "4",
      "name": "Condenser Coil",
      "oemPartNumber": "HA42CZ236",
      "substitutions": [],
      "oemCost": 520.00,
      "retailPrice": 3900.00,
      "category": "coil",
      "warrantyEligible": true,
      "diagramPosition": {
        "top": "50%",
        "left": "40%"
      }
    },
    {
      "id": "part-5",
      "number": "5",
      "name": "Dual Capacitor 45/5 MFD",
      "oemPartNumber": "P291-4553RS",
      "substitutions": ["CAP-45/5-370", "TURBO-200"],
      "oemCost": 42.00,
      "retailPrice": 420.00,
      "category": "electrical",
      "warrantyEligible": false
    },
    {
      "id": "part-6",
      "number": "6",
      "name": "Contactor 2-Pole 40A",
      "oemPartNumber": "EAC2P40",
      "substitutions": ["CONT-2P40-24V"],
      "oemCost": 38.00,
      "retailPrice": 380.00,
      "category": "electrical",
      "warrantyEligible": false
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
        "question": "null",
        "action": "Low refrigerant charge detected. Check for leaks before replacing compressor. May need leak seal or repair."
      },
      {
        "id": 4,
        "question": "null",
        "action": "Compressor failure likely. Check amp draw and verify with manufacturer specs. Replace compressor if confirmed."
      },
      {
        "id": 5,
        "question": "null",
        "action": "Compressor locked rotor. Check capacitor first. If capacitor OK, replace compressor."
      },
      {
        "id": 6,
        "question": "null",
        "action": "Check electrical connections and contactor. If OK, compressor may have open windings - replace."
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
        "question": "null",
        "action": "Motor failure. Check capacitor first. If capacitor is good, replace motor."
      },
      {
        "id": 4,
        "question": "null",
        "action": "Seized bearing. Replace motor immediately to prevent further damage."
      },
      {
        "id": 5,
        "question": "null",
        "action": "Bearing wear detected. Motor replacement recommended. Check blade balance."
      },
      {
        "id": 6,
        "question": "null",
        "action": "Check for loose mounting or debris. If clear, check capacitor and voltage."
      }
    ],
    "part-3": [
      {
        "id": 0,
        "question": "Is the system completely unresponsive?",
        "yesNext": 1,
        "noNext": 2
      },
      {
        "id": 1,
        "question": "Do you have 24V at the R and C terminals?",
        "yesNext": 3,
        "noNext": 4
      },
      {
        "id": 2,
        "question": "Are error codes displaying?",
        "yesNext": 5,
        "noNext": 6
      },
      {
        "id": 3,
        "question": "null",
        "action": "Control board failure. Replace board and verify all connections."
      },
      {
        "id": 4,
        "question": "null",
        "action": "Check transformer and fuses first. If OK, trace 24V circuit."
      },
      {
        "id": 5,
        "question": "null",
        "action": "Document error codes. Check manufacturer troubleshooting guide. May need board reset or replacement."
      },
      {
        "id": 6,
        "question": "null",
        "action": "Intermittent operation suggests board issue. Check for loose connections or corrosion."
      }
    ]
  },

  "literatureUrls": {
    "installation": "https://www.carrier.com/residential/en/us/products/air-conditioners/installation/",
    "diagnostic": "https://www.carrier.com/residential/en/us/products/air-conditioners/service/",
    "warranty": "https://www.carrier.com/residential/en/us/warranty/",
    "productData": "https://www.carrier.com/residential/en/us/products/air-conditioners/",
    "all": "https://www.carrier.com/residential/en/us/literature/"
  },

  "serviceHistory": [
    {
      "date": "2024-08-15",
      "tech": "John Smith",
      "partReplaced": "Dual Capacitor",
      "type": "Service Call",
      "status": "Complete"
    },
    {
      "date": "2023-06-22",
      "tech": "Mike Johnson",
      "partReplaced": "Contactor",
      "type": "Warranty",
      "status": "Paid"
    }
  ]
}
```

## Orders Collection

### Collection: `orders`
### Document ID: Auto-generated by Firestore

```json
{
  "unitSerial": "2620E31113",
  "unitModel": "186CNVO24000FAAA",
  "techUid": "firebase-user-id",
  "techName": "Tech John",
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
      "substitutions": ["06EA660362-R", "COMP-ALT-001"],
      "oemCost": 1250.00,
      "retailPrice": 9375.00,
      "category": "compressor",
      "warrantyEligible": true,
      "quantity": 1,
      "notes": "Customer reports unit not cooling",
      "troubleshootingComplete": true
    }
  ]
}
```

## How to Add a Unit to Firebase

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `unitiq-enterprise`
3. Navigate to **Firestore Database**
4. Create the collection path: `artifacts/unitiq-enterprise-v1/public/data/units`
5. Click **Add Document**
6. Set **Document ID** to the unit serial number (e.g., `2620E31113`)
7. Add the fields as shown in the JSON structure above

## Notes

- **Serial numbers** should be uppercase
- **Warranty Status** can be: `Active`, `Expired`, or `Limited`
- **Diagram URLs** should point to hosted images (Firebase Storage or CDN)
- **Troubleshooting** flows use a decision tree with yes/no questions
- **Parts** with `warrantyEligible: true` will show $0 cost to customer
- **OEM Cost** is multiplied by 7.5-10x for retail pricing
- **Substitutions** array lists alternative part numbers

## Example Usage

When a tech scans barcode `2620E31113`, the app:
1. Queries Firestore: `/artifacts/unitiq-enterprise-v1/public/data/units/2620E31113`
2. Loads unit data with all parts, warranty info, and troubleshooting flows
3. Displays product details screen with all available information
4. Allows tech to select parts and run troubleshooting diagnostics
5. Submits order to `/artifacts/unitiq-enterprise-v1/public/data/orders` collection
