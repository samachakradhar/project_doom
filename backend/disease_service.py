import os
import re
import json
from typing import Optional, Dict, Any, List

TOP_50_DISEASES: List[Dict[str, Any]] = [
    {
        "id": 1,
        "name": "Common cold",
        "category": "Infectious diseases",
        "symptoms": "Sneezing, runny nose, sore throat, mild congestion",
        "treatment": "Rest and symptom relief, saline nasal drops, paracetamol if needed",
        "precautions_and_food": "Handwashing, warm soups, herbal tea, plenty of fluids, rest",
        "keywords": ["common cold", "cold", "coryza", "rhinovirus", "runny nose"]
    },
    {
        "id": 2,
        "name": "Influenza (flu)",
        "category": "Infectious diseases",
        "symptoms": "Fever, cough, body aches, chills, extreme fatigue",
        "treatment": "Symptom care, hydration, rest; antivirals (Oseltamivir) for high-risk patients",
        "precautions_and_food": "Vaccination, isolation, nutritious warm broths, steam inhalation",
        "keywords": ["influenza", "flu", "h1n1", "influenza a", "influenza b"]
    },
    {
        "id": 3,
        "name": "COVID-19",
        "category": "Infectious diseases",
        "symptoms": "Cough, fever, fatigue, loss of smell/taste, breathlessness",
        "treatment": "Supportive care, hydration, SpO2 monitoring; Paxlovid/antivirals for eligible patients",
        "precautions_and_food": "N95 mask, ventilation, isolation, vitamin C, zinc, balanced protein diet",
        "keywords": ["covid-19", "covid", "coronavirus", "sars-cov-2"]
    },
    {
        "id": 4,
        "name": "Dengue",
        "category": "Infectious diseases",
        "symptoms": "High fever, retro-orbital headache, severe joint/body pain, rash, low platelets",
        "treatment": "Strict medical monitoring, frequent platelet checks, aggressive oral/IV hydration. Paracetamol ONLY. STRICTLY AVOID NSAIDs (Ibuprofen, Aspirin) due to bleeding risk.",
        "precautions_and_food": "Mosquito protection, tender coconut water, ORS, papaya leaf extract as advised, avoid dark colored foods that mimic bleeding",
        "keywords": ["dengue", "dengue fever", "ns1 antigen", "breakbone fever"]
    },
    {
        "id": 5,
        "name": "Malaria",
        "category": "Infectious diseases",
        "symptoms": "Fever with chills and rigors, sweating, headache, nausea",
        "treatment": "Tested, species-appropriate antimalarial treatment (Artemisinin-based combination therapy or Chloroquine)",
        "precautions_and_food": "Bed nets, mosquito repellents, safe water, easy-to-digest light khichdi",
        "keywords": ["malaria", "plasmodium", "plasmodium vivax", "plasmodium falciparum"]
    },
    {
        "id": 6,
        "name": "Typhoid fever",
        "category": "Infectious diseases",
        "symptoms": "Prolonged step-ladder fever, severe abdominal pain, weakness, rose spots",
        "treatment": "Prescribed antibiotic therapy (Azithromycin, Ceftriaxone, or Ciprofloxacin)",
        "precautions_and_food": "Safe boiled water, thoroughly cooked soft food, avoid raw vegetables/salads",
        "keywords": ["typhoid", "typhoid fever", "enteric fever", "salmonella typhi", "widal"]
    },
    {
        "id": 7,
        "name": "Tuberculosis",
        "category": "Infectious diseases",
        "symptoms": "Persistent cough >2 weeks, hemoptysis (blood in sputum), weight loss, evening fevers, night sweats",
        "treatment": "Directly Observed Therapy (DOTS) complete multidrug regimen (Rifampicin, Isoniazid, Pyrazinamide, Ethambutol)",
        "precautions_and_food": "Strict adherence to complete course, well-ventilated rooms, high protein diet (eggs, pulses, milk)",
        "keywords": ["tuberculosis", "tb", "pulmonary tb", "mycobacterium", "dots"]
    },
    {
        "id": 8,
        "name": "Pneumonia",
        "category": "Infectious diseases",
        "symptoms": "Productive cough with rust/green phlegm, high fever, chest pain, breathlessness",
        "treatment": "Appropriate antibiotics or antivirals depending on pathogen; oxygen support if hypoxic",
        "precautions_and_food": "Pneumococcal vaccination, deep breathing exercises, plenty of warm fluids",
        "keywords": ["pneumonia", "bronchopneumonia", "lung consolidation"]
    },
    {
        "id": 9,
        "name": "Acute diarrhoea",
        "category": "Infectious diseases",
        "symptoms": "Frequent loose watery stools, abdominal cramps, dehydration",
        "treatment": "Oral Rehydration Salts (ORS), Zinc supplementation, cause-specific treatment",
        "precautions_and_food": "Safe filtered water, BRAT diet (bananas, rice, applesauce, toast), strict hand hygiene",
        "keywords": ["acute diarrhoea", "diarrhea", "diarrhoea", "loose stools", "gastroenteritis"]
    },
    {
        "id": 10,
        "name": "Cholera",
        "category": "Infectious diseases",
        "symptoms": "Severe profuse 'rice-water' watery diarrhoea, rapid dehydration, muscle cramps",
        "treatment": "Urgent aggressive oral/IV rehydration, zinc, selected antibiotics (Doxycycline/Azithromycin)",
        "precautions_and_food": "Safe drinking water, boiled food, immediate ORS administration, sanitation",
        "keywords": ["cholera", "vibrio cholerae", "rice water stool"]
    },
    {
        "id": 11,
        "name": "Urinary tract infection",
        "category": "Infectious diseases",
        "symptoms": "Burning sensation during urination (dysuria), urinary frequency, cloudy urine",
        "treatment": "Urine culture assessment and targeted antibiotics (Nitrofurantoin, Fosfomycin, Cotrimoxazole)",
        "precautions_and_food": "Drink 3-4 liters water daily, maintain personal hygiene, avoid holding urine",
        "keywords": ["urinary tract infection", "uti", "cystitis", "dysuria", "urine infection"]
    },
    {
        "id": 12,
        "name": "Hepatitis A",
        "category": "Infectious diseases",
        "symptoms": "Nausea, extreme fatigue, jaundice (yellow eyes/skin), dark amber urine, pale stools",
        "treatment": "Supportive hepatic care, liver function monitoring, rest; avoid hepatotoxic drugs",
        "precautions_and_food": "Avoid alcohol, avoid oily/heavy foods, eat simple carbohydrates (sugarcane juice, glucose, fruits)",
        "keywords": ["hepatitis a", "hav", "jaundice", "infectious hepatitis"]
    },
    {
        "id": 13,
        "name": "Type 2 diabetes",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Excessive thirst (polydipsia), frequent urination (polyuria), unexplained hunger, fatigue",
        "treatment": "Glycemic management (Metformin, SGLT2i, DPP-4i), lifestyle modifications, insulin if indicated",
        "precautions_and_food": "Low GI diet, eliminate refined sugars, portion control, daily 30-min walking, daily foot inspection",
        "keywords": ["type 2 diabetes", "diabetes mellitus", "t2d", "diabetes", "hyperglycemia", "hba1c"]
    },
    {
        "id": 14,
        "name": "High blood pressure",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Often completely asymptomatic; morning headaches, dizziness, chest tightness in severe stages",
        "treatment": "Anti-hypertensive therapy (Telmisartan, Amlodipine, Ramipril), regular BP monitoring",
        "precautions_and_food": "DASH diet, restrict salt to <2g/day, regular aerobic activity, zero tobacco, stress management",
        "keywords": ["high blood pressure", "hypertension", "htn", "high bp", "elevated bp"]
    },
    {
        "id": 15,
        "name": "High cholesterol",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Usually silent until arterial plaque forms; xanthomas in familial cases",
        "treatment": "Statin therapy (Atorvastatin, Rosuvastatin), lifestyle changes, lipid panel monitoring",
        "precautions_and_food": "Oats, legumes, nuts, flaxseeds, eliminate trans fats and deep-fried foods",
        "keywords": ["high cholesterol", "hypercholesterolemia", "hyperlipidemia", "dyslipidemia", "ldl"]
    },
    {
        "id": 16,
        "name": "Obesity",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Excess body fat, high BMI (>30), joint strain, shortness of breath on exertion",
        "treatment": "Caloric deficit nutrition support, regular physical activity, structured lifestyle counseling",
        "precautions_and_food": "Mindful eating, balanced portions, avoid ultra-processed foods and sugary beverages",
        "keywords": ["obesity", "morbid obesity", "overweight", "bmi high"]
    },
    {
        "id": 17,
        "name": "Coronary artery disease",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Chest tightness (angina) radiating to left arm/jaw, breathlessness, exertion fatigue",
        "treatment": "Antiplatelets (Aspirin, Clopidogrel), statins, beta-blockers, coronary angiography/stenting when indicated",
        "precautions_and_food": "Zero tobacco, low saturated fat diet, heart-healthy exercise under supervision",
        "keywords": ["coronary artery disease", "cad", "ischemic heart disease", "ihd", "angina"]
    },
    {
        "id": 18,
        "name": "Heart failure",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Bilateral pedal edema (leg swelling), shortness of breath when lying flat (orthopnea), fatigue",
        "treatment": "Guideline-directed medical therapy (ARNI/ACEi, Beta-blockers, SGLT2i, Loop Diuretics like Furosemide)",
        "precautions_and_food": "Daily weight tracking, strict fluid and sodium restriction, avoid unprescribed painkillers",
        "keywords": ["heart failure", "chf", "congestive heart failure", "cardiac failure"]
    },
    {
        "id": 19,
        "name": "Stroke",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Sudden facial droop, arm weakness, slurred speech (FAST warning signs), sudden loss of balance",
        "treatment": "Time-critical emergency brain imaging; thrombolysis (tPA) or mechanical thrombectomy for ischemic stroke",
        "precautions_and_food": "Control BP, diabetes and lipids; anticoagulation for atrial fibrillation; rehabilitation",
        "keywords": ["stroke", "cva", "cerebrovascular accident", "ischemic stroke", "hemiplegia"]
    },
    {
        "id": 20,
        "name": "Anaemia",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Chronic fatigue, pale conjunctiva/skin, dizziness, brittle nails, breathlessness on exertion",
        "treatment": "Identify root etiology (iron deficiency, B12/folate, hemolysis); oral or IV iron replacement",
        "precautions_and_food": "Green leafy vegetables, lentils, dates, pomegranate, jaggery; take iron with vitamin C",
        "keywords": ["anaemia", "anemia", "iron deficiency", "low hemoglobin", "microcytic"]
    },
    {
        "id": 21,
        "name": "Vitamin D deficiency",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Diffuse bone aches, muscle weakness, frequent infections, fatigue",
        "treatment": "Clinician-guided Cholecalciferol (60,000 IU weekly) replacement therapy",
        "precautions_and_food": "Safe morning sunlight exposure (15-20 mins), fortified milk, mushrooms, egg yolks",
        "keywords": ["vitamin d deficiency", "hypovitaminosis d", "vitamin d low", "cholecalciferol"]
    },
    {
        "id": 22,
        "name": "Osteoporosis",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Fragile bones, height loss, stooped posture, low-impact fractures (hip, spine, wrist)",
        "treatment": "DEXA scan evaluation, bisphosphonates (Alendronate), Calcium and Vitamin D3 supplementation",
        "precautions_and_food": "Calcium-rich dairy, ragi, sesame seeds; fall prevention strategies at home; safe weight-bearing exercise",
        "keywords": ["osteoporosis", "osteopenia", "bone mineral density", "fragility fracture"]
    },
    {
        "id": 23,
        "name": "Chronic kidney disease",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Often silent initially; facial puffiness, leg swelling, elevated creatinine, reduced eGFR, fatigue",
        "treatment": "Treat root cause (diabetes/hypertension), nephroprotective drugs (SGLT2i, ARBs), renal monitoring",
        "precautions_and_food": "STRICT AVOIDANCE OF NSAIDs (Ibuprofen, Diclofenac); controlled protein, potassium, and sodium intake",
        "keywords": ["chronic kidney disease", "ckd", "renal failure", "elevated creatinine", "nephropathy"]
    },
    {
        "id": 24,
        "name": "Fatty liver disease",
        "category": "Lifestyle, heart and metabolic diseases",
        "symptoms": "Frequently asymptomatic; mild right upper quadrant abdominal discomfort, elevated ALT/AST",
        "treatment": "Sustainable 7-10% weight loss, metabolic risk factor control, hepatoprotective lifestyle",
        "precautions_and_food": "Eliminate sugar-sweetened sodas, reduce refined carbs, complete alcohol abstinence",
        "keywords": ["fatty liver", "nafld", "masld", "hepatic steatosis"]
    },
    {
        "id": 25,
        "name": "Asthma",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Recurrent wheezing, nighttime cough, chest tightness, shortness of breath",
        "treatment": "Inhaled corticosteroids (ICS) combined with fast-acting bronchodilator (SABA) via spacer",
        "precautions_and_food": "Avoid dust, animal dander, smoke, cold air triggers; rinse mouth after steroid inhalers",
        "keywords": ["asthma", "bronchial asthma", "wheezing", "inhaler", "salbutamol", "budesonide"]
    },
    {
        "id": 26,
        "name": "COPD",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Persistent progressive shortness of breath, chronic productive cough, frequent chest infections",
        "treatment": "Long-acting bronchodilators (LAMA + LABA inhalers), pulmonary rehabilitation, smoking cessation",
        "precautions_and_food": "Complete cessation of smoking, avoid biomass smoke exposure, annual flu vaccination",
        "keywords": ["copd", "chronic obstructive pulmonary", "emphysema", "chronic bronchitis"]
    },
    {
        "id": 27,
        "name": "Allergic rhinitis",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Paroxysmal sneezing, itchy watery eyes, clear runny nose, nasal congestion",
        "treatment": "Non-sedating antihistamines (Cetirizine, Fexofenadine), intranasal corticosteroid spray",
        "precautions_and_food": "Reduce exposure to pollen and dust mites, keep windows closed during high pollen counts",
        "keywords": ["allergic rhinitis", "hay fever", "allergic sneeze", "nasal allergy"]
    },
    {
        "id": 28,
        "name": "Acid reflux (GERD)",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Retrosternal heartburn, regurgitation of sour acid, globus sensation in throat, belching",
        "treatment": "Proton pump inhibitors (Pantoprazole, Omeprazole) taken before breakfast, antacids",
        "precautions_and_food": "Smaller frequent meals; avoid lying flat within 2-3 hours of dinner; elevate head of bed; avoid late caffeine",
        "keywords": ["acid reflux", "gerd", "gastroesophageal reflux", "heartburn", "dyspepsia"]
    },
    {
        "id": 29,
        "name": "Peptic ulcer disease",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Burning epigastric pain relieved or worsened by food, nausea, fullness, vomiting",
        "treatment": "H. pylori eradication (PPI + Amoxicillin + Clarithromycin), mucosal protectants (Sucralfate)",
        "precautions_and_food": "ABSOLUTE AVOIDANCE of NSAIDs (Ibuprofen, Diclofenac, Aspirin); avoid spicy pickles, raw chilies, smoking",
        "keywords": ["peptic ulcer", "peptic ulcer disease", "gastric ulcer", "duodenal ulcer", "stomach ulcer"]
    },
    {
        "id": 30,
        "name": "Constipation",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Infrequent bowel movements (<3/week), hard lumpy stools, straining, feeling of incomplete evacuation",
        "treatment": "Dietary fiber escalation (Psyllium husk), adequate hydration, osmotic laxatives if necessary",
        "precautions_and_food": "Whole grains, papayas, prunes, leafy vegetables, 2.5-3 liters water daily, regular toilet routine",
        "keywords": ["constipation", "hard stools", "straining", "chronic constipation"]
    },
    {
        "id": 31,
        "name": "Irritable bowel syndrome",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Recurrent abdominal pain related to defecation, alternating diarrhoea and constipation, bloating",
        "treatment": "Individualized symptom management, antispasmodics, probiotic trial, stress reduction",
        "precautions_and_food": "Low-FODMAP dietary trial, track individual food triggers, regular meal timing",
        "keywords": ["irritable bowel syndrome", "ibs", "spastic colon", "functional bowel"]
    },
    {
        "id": 32,
        "name": "Gallstones",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Severe episodic right upper abdominal pain radiating to right shoulder (biliary colic), nausea after fatty meals",
        "treatment": "Observation for asymptomatic stones; laparoscopic cholecystectomy for symptomatic gallstones",
        "precautions_and_food": "Low-fat, balanced meals; avoid rapid crash dieting and high-cholesterol deep fried feasts",
        "keywords": ["gallstones", "cholelithiasis", "gallbladder stones", "biliary colic"]
    },
    {
        "id": 33,
        "name": "Kidney stones",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Severe sharp flank/side pain radiating to groin (renal colic), hematuria (blood in urine), painful urination",
        "treatment": "Adequate analgesia, alpha-blockers (Tamsulosin) for passage; lithotripsy or ureteroscopy for large stones",
        "precautions_and_food": "Drink 3 liters of water daily to maintain pale urine; reduce excess sodium and animal proteins",
        "keywords": ["kidney stones", "renal calculi", "nephrolithiasis", "urolithiasis", "kidney stone"]
    },
    {
        "id": 34,
        "name": "Urinary incontinence",
        "category": "Respiratory, digestive and urinary diseases",
        "symptoms": "Involuntary loss of urine on coughing/sneezing (stress incontinence) or sudden uncontrollable urge",
        "treatment": "Pelvic floor muscle training (Kegel exercises), bladder retraining, antimuscarinics/beta-3 agonists if urge",
        "precautions_and_food": "Avoid excessive bladder irritants (caffeine, alcohol, spicy foods); do not severely restrict hydration",
        "keywords": ["urinary incontinence", "bladder leakage", "overactive bladder", "oab"]
    },
    {
        "id": 35,
        "name": "Acne",
        "category": "Skin, eye, dental and joint diseases",
        "symptoms": "Comedones (blackheads/whiteheads), inflammatory papules, pustules, cysts on face and back",
        "treatment": "Topical retinoids, benzoyl peroxide, topical/oral antibiotics (Doxycycline) or Isotretinoin under dermatology care",
        "precautions_and_food": "Gentle non-comedogenic skin cleansing; strictly avoid squeezing/picking lesions to prevent scars",
        "keywords": ["acne", "acne vulgaris", "pimples", "breakouts"]
    },
    {
        "id": 36,
        "name": "Eczema",
        "category": "Skin, eye, dental and joint diseases",
        "symptoms": "Intensely itchy, dry, erythematous, cracked skin plaques commonly in skin flexures",
        "treatment": "Liberal emollient moisturizers, topical corticosteroids for flares, topical calcineurin inhibitors",
        "precautions_and_food": "Apply moisturizers immediately after bathing; avoid harsh soaps, woolen clothing, and known allergens",
        "keywords": ["eczema", "atopic dermatitis", "dermatitis"]
    },
    {
        "id": 37,
        "name": "Ringworm",
        "category": "Skin, eye, dental and joint diseases",
        "symptoms": "Annular circular itchy rash with raised red active edges and central clearing (tinea)",
        "treatment": "Topical antifungal creams (Clotrimazole, Terbinafine); oral antifungals for widespread infections",
        "precautions_and_food": "Keep skin folds clean and dry; do not share towels, combs, or bed linen; complete entire antifungal course",
        "keywords": ["ringworm", "tinea", "tinea corporis", "fungal infection"]
    },
    {
        "id": 38,
        "name": "Scabies",
        "category": "Skin, eye, dental and joint diseases",
        "symptoms": "Intense generalized itching markedly worse at night; linear burrows in finger webs, wrists, and waist",
        "treatment": "Permethrin 5% cream applied neck-to-toe or oral Ivermectin; simultaneous treatment of all household contacts",
        "precautions_and_food": "Wash all recently worn clothing and bedsheets in hot water; dry on high heat or seal in bags for 72 hours",
        "keywords": ["scabies", "sarcoptes scabiei", "night itching"]
    },
    {
        "id": 39,
        "name": "Dental caries",
        "category": "Skin, eye, dental and joint diseases",
        "symptoms": "Toothache, sensitivity to hot, cold, or sugary foods, visible cavities or brown staining",
        "treatment": "Dental evaluation, tooth restoration/fillings, root canal therapy if pulp is infected",
        "precautions_and_food": "Brush twice daily with fluoridated toothpaste, floss daily, minimize sugary snacks and carbonated drinks",
        "keywords": ["dental caries", "tooth cavity", "tooth decay", "toothache"]
    },
    {
        "id": 40,
        "name": "Gum disease",
        "category": "Skin, eye, dental and joint diseases",
        "symptoms": "Red swollen gums that bleed upon brushing, persistent halitosis (bad breath), receding gum line",
        "treatment": "Professional dental scaling and root planing, antibacterial chlorhexidine mouthwash",
        "precautions_and_food": "Gentle circular brushing, interdental cleaning, routine dental scaling every 6 months, stop smoking",
        "keywords": ["gum disease", "gingivitis", "periodontitis", "bleeding gums"]
    },
    {
        "id": 41,
        "name": "Refractive errors",
        "category": "Skin, eye, dental and joint diseases",
        "symptoms": "Blurred vision at distance (myopia) or near (hyperopia/presbyopia), eye strain, frequent headaches",
        "treatment": "Comprehensive optometrist examination, prescription corrective eyeglasses, contact lenses, or LASIK surgery",
        "precautions_and_food": "Follow 20-20-20 rule during screen use, regular eye checks, proper lighting when reading",
        "keywords": ["refractive errors", "myopia", "hyperopia", "astigmatism", "presbyopia", "blurred vision"]
    },
    {
        "id": 42,
        "name": "Osteoarthritis",
        "category": "Skin, eye, dental and joint diseases",
        "symptoms": "Deep aching joint pain worse with activity, morning stiffness (<30 mins), crepitus, reduced mobility",
        "treatment": "Low-impact exercise, weight reduction, topical NSAIDs/capsaicin, paracetamol, physiotherapy",
        "precautions_and_food": "Swimming and cycling for joint preservation, avoid high-impact jumping, maintain healthy weight",
        "keywords": ["osteoarthritis", "oa", "joint degeneration", "knee osteoarthritis"]
    },
    {
        "id": 43,
        "name": "Migraine",
        "category": "Neurological, mental health and other diseases",
        "symptoms": "Unilateral throbbing pulsating headache, photophobia (light sensitivity), phonophobia, nausea, aura",
        "treatment": "Abortive triptans (Sumatriptan) taken at onset; preventive therapy (Propranolol, Topiramate) for frequent attacks",
        "precautions_and_food": "Maintain consistent sleep routine, avoid skipping meals, stay hydrated, track triggers like MSG/aged cheese",
        "keywords": ["migraine", "hemicrania", "migraine headache", "aura"]
    },
    {
        "id": 44,
        "name": "Epilepsy",
        "category": "Neurological, mental health and other diseases",
        "symptoms": "Recurrent unprovoked seizures, involuntary convulsions, staring spells, temporary loss of awareness",
        "treatment": "Seizure-type tailored anti-epileptic drugs (Levetiracetam, Valproate, Carbamazepine) taken consistently",
        "precautions_and_food": "Strict adherence to medicine timings (never skip doses), adequate sleep, avoid swimming alone or driving unmanaged",
        "keywords": ["epilepsy", "seizure", "convulsions", "seizure disorder"]
    },
    {
        "id": 45,
        "name": "Depression",
        "category": "Neurological, mental health and other diseases",
        "symptoms": "Persistent sad mood, loss of interest in activities (anhedonia), sleep disturbances, feelings of worthlessness",
        "treatment": "Cognitive Behavioral Therapy (CBT), SSRI/SNRI antidepressant medications under psychiatrist guidance",
        "precautions_and_food": "Structured daily routine, regular physical exercise, social connection, avoid alcohol and isolation",
        "keywords": ["depression", "major depressive", "mdd", "depressive episode"]
    },
    {
        "id": 46,
        "name": "Anxiety disorders",
        "category": "Neurological, mental health and other diseases",
        "symptoms": "Excessive uncontrollable worry, restlessness, palpitations, rapid breathing, panic attacks",
        "treatment": "Psychotherapy, relaxation training, mindfulness, SSRIs or brief anxiolytics if indicated",
        "precautions_and_food": "Cut down caffeine and energy drinks, practice diaphragmatic breathing, ensure consistent sleep hygiene",
        "keywords": ["anxiety", "anxiety disorders", "gad", "panic disorder", "panic attack"]
    },
    {
        "id": 47,
        "name": "Hypothyroidism",
        "category": "Neurological, mental health and other diseases",
        "symptoms": "Persistent fatigue, cold intolerance, unexplained weight gain, dry skin, constipation, elevated TSH",
        "treatment": "Levothyroxine replacement therapy taken empty stomach in the morning 30-60 minutes before breakfast",
        "precautions_and_food": "Take tablet strictly with plain water, wait 4 hours before taking calcium/iron supplements, annual TSH check",
        "keywords": ["hypothyroidism", "underactive thyroid", "elevated tsh", "thyroid low"]
    },
    {
        "id": 48,
        "name": "Hyperthyroidism",
        "category": "Neurological, mental health and other diseases",
        "symptoms": "Unexplained weight loss, heat intolerance, tremors, palpitations, anxiety, suppressed TSH, high T3/T4",
        "treatment": "Antithyroid medications (Methimazole, Carbimazole), Beta-blockers for symptoms, radioactive iodine or surgery",
        "precautions_and_food": "Avoid unprescribed excess iodine supplements, monitor heart rate, maintain regular clinical follow-up",
        "keywords": ["hyperthyroidism", "overactive thyroid", "graves disease", "thyrotoxicosis"]
    },
    {
        "id": 49,
        "name": "Rheumatoid arthritis",
        "category": "Neurological, mental health and other diseases",
        "symptoms": "Symmetrical joint swelling, pain and tenderness in small joints of hands/feet, prolonged morning stiffness (>1 hour)",
        "treatment": "Disease-modifying antirheumatic drugs (DMARDs like Methotrexate, Sulfasalazine, biologics) under rheumatology care",
        "precautions_and_food": "Early rheumatology consultation prevents joint destruction; gentle range-of-motion exercise; smoking cessation",
        "keywords": ["rheumatoid arthritis", "ra", "rheumatoid factor", "anti-ccp"]
    },
    {
        "id": 50,
        "name": "Cancer",
        "category": "Neurological, mental health and other diseases",
        "symptoms": "Unexplained rapid weight loss, persistent lumps, non-healing ulcers, changes in bowel/bladder habits, unusual bleeding",
        "treatment": "Multidisciplinary oncology evaluation: surgical resection, chemotherapy, radiation therapy, immunotherapy, or targeted therapy",
        "precautions_and_food": "Zero tobacco, avoid alcohol, nutritious high-calorie high-protein diet during treatment, complete routine screenings",
        "keywords": ["cancer", "carcinoma", "malignancy", "neoplasm", "tumor", "oncology"]
    }
]

# Fast lookup dictionary by lowercase clean key
DISEASE_LOOKUP = {d["name"].lower(): d for d in TOP_50_DISEASES}


def match_disease_from_text(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Scans any prescription, lab report, or OCR string and returns the matched
    disease strictly if it appears in the text.
    """
    if not raw_text:
        return None

    clean_text = raw_text.lower()

    # 1. Exact Name & Keyword match across the 50 diseases
    for d in TOP_50_DISEASES:
        # Check primary disease name
        name_lower = d["name"].lower()
        # Clean parenthesized parts for checking
        core_name = re.sub(r'\(.*?\)', '', name_lower).strip()
        
        pattern = r'\b' + re.escape(core_name) + r'\b'
        if re.search(pattern, clean_text):
            return d

        # Check disease keywords
        for kw in d["keywords"]:
            kw_pattern = r'\b' + re.escape(kw.lower()) + r'\b'
            if re.search(kw_pattern, clean_text):
                return d

    return None


def get_all_disease_names() -> List[str]:
    return [d["name"] for d in TOP_50_DISEASES]
