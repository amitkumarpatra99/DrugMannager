import type { Medicine } from '../types';

export const mockInventory: Medicine[] = [
  { id: 'med-1', name: 'Paracetamol 650mg (Dolo)', price: 15.0, stock: 120, dosage: '1 tablet as needed', category: 'Analgesics / Antipyretics' },
  { id: 'med-2', name: 'Amoxicillin 500mg (Novamox)', price: 85.5, stock: 50, dosage: '1 tablet thrice daily', category: 'Antibiotics' },
  { id: 'med-3', name: 'Cetirizine 10mg (Okacet)', price: 20.0, stock: 100, dosage: '1 tablet at bedtime', category: 'Antihistamines' },
  { id: 'med-4', name: 'Metformin 500mg (Glycomet)', price: 45.0, stock: 150, dosage: '1 tablet with dinner', category: 'Antidiabetics' },
  { id: 'med-5', name: 'Atorvastatin 10mg (Lipvas)', price: 90.0, stock: 80, dosage: '1 tablet daily at night', category: 'Cardiovascular' },
  { id: 'med-6', name: 'Ibuprofen 400mg (Combiflam)', price: 18.0, stock: 95, dosage: '1 tablet post meal', category: 'Analgesics' },
  { id: 'med-7', name: 'Pantoprazole 40mg (Pan-40)', price: 65.0, stock: 110, dosage: '1 tablet empty stomach', category: 'Antacids' },
  { id: 'med-8', name: 'Montelukast + Levocetirizine (Montair LC)', price: 110.0, stock: 60, dosage: '1 tablet daily at night', category: 'Respiratory / Allergy' },
  { id: 'med-9', name: 'Azithromycin 500mg (Azee)', price: 120.0, stock: 40, dosage: '1 tablet daily for 3 days', category: 'Antibiotics' },
  { id: 'med-10', name: 'Amlodipine 5mg (Amlong)', price: 22.0, stock: 85, dosage: '1 tablet daily in morning', category: 'Cardiovascular' },
  { id: 'med-11', name: 'Multivitamin Capsules (Zincovit)', price: 105.0, stock: 200, dosage: '1 capsule daily after breakfast', category: 'Vitamins & Supplements' },
  { id: 'med-12', name: 'Cough Syrup (Alex)', price: 95.0, stock: 35, dosage: '5ml thrice daily', category: 'Cough & Cold' },
  { id: 'med-13', name: 'ORAL REHYDRATION SALTS (ORS)', price: 19.5, stock: 150, dosage: 'Dissolve in 1L water', category: 'Electrolytes' },
  { id: 'med-14', name: 'Diclofenac Gel 30g (Volini)', price: 85.0, stock: 45, dosage: 'Apply locally 3 times daily', category: 'Pain Relief Ointment' },
  { id: 'med-15', name: 'Limcee Vitamin C 500mg Chewable', price: 25.0, stock: 250, dosage: '1 tablet to chew daily', category: 'Vitamins & Supplements' }
];
