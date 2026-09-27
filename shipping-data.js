// Grille de livraison fournie directement par le client le 2026-09-27. Un tarif bureau a 0 signifie indisponible.
const SHIPPING_WILAYAS = [
  {
    "name": "Adrar",
    "desk": 850,
    "home": 1650
  },
  {
    "name": "Chlef",
    "desk": 450,
    "home": 700
  },
  {
    "name": "Laghouat",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Oum El Bouaghi",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Batna",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Bejaia",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Biskra",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Bechar",
    "desk": 650,
    "home": 1200
  },
  {
    "name": "Blida",
    "desk": 400,
    "home": 650
  },
  {
    "name": "Bouira",
    "desk": 450,
    "home": 650
  },
  {
    "name": "Tamanrasset",
    "desk": 1000,
    "home": 1800
  },
  {
    "name": "Tebessa",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Tlemcen",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Tiaret",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Tizi Ouzou",
    "desk": 450,
    "home": 650
  },
  {
    "name": "Alger",
    "desk": 300,
    "home": 450
  },
  {
    "name": "Djelfa",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Jijel",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Setif",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Saida",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Skikda",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Sidi Bel Abbes",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Annaba",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Guelma",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Constantine",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Medea",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Mostaganem",
    "desk": 450,
    "home": 850
  },
  {
    "name": "M'Sila",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Mascara",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Ouargla",
    "desk": 500,
    "home": 1000
  },
  {
    "name": "Oran",
    "desk": 450,
    "home": 850
  },
  {
    "name": "El Bayadh",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Illizi",
    "desk": 850,
    "home": 1700
  },
  {
    "name": "Bordj Bou Arreridj",
    "desk": 450,
    "home": 650
  },
  {
    "name": "Boumerdes",
    "desk": 400,
    "home": 650
  },
  {
    "name": "El Tarf",
    "desk": 550,
    "home": 850
  },
  {
    "name": "Tindouf",
    "desk": 0,
    "home": 1650
  },
  {
    "name": "Tissemsilt",
    "desk": 450,
    "home": 850
  },
  {
    "name": "El Oued",
    "desk": 600,
    "home": 950
  },
  {
    "name": "Khenchela",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Souk Ahras",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Tipaza",
    "desk": 450,
    "home": 650
  },
  {
    "name": "Mila",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Ain Defla",
    "desk": 450,
    "home": 650
  },
  {
    "name": "Naama",
    "desk": 500,
    "home": 950
  },
  {
    "name": "Ain Temouchent",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Ghardaia",
    "desk": 650,
    "home": 950
  },
  {
    "name": "Relizane",
    "desk": 450,
    "home": 850
  },
  {
    "name": "Timimoun",
    "desk": 850,
    "home": 1650
  },
  {
    "name": "Bordj Badji Mokhtar",
    "desk": 0,
    "home": 1600
  },
  {
    "name": "Ouled Djellal",
    "desk": 450,
    "home": 950
  },
  {
    "name": "Beni Abbes",
    "desk": 0,
    "home": 1300
  },
  {
    "name": "In Salah",
    "desk": 850,
    "home": 1650
  },
  {
    "name": "In Guezzam",
    "desk": 0,
    "home": 1500
  },
  {
    "name": "Touggourt",
    "desk": 500,
    "home": 950
  },
  {
    "name": "Djanet",
    "desk": 1000,
    "home": 2000
  },
  {
    "name": "El M'Ghair",
    "desk": 500,
    "home": 950
  },
  {
    "name": "El Meniaa",
    "desk": 500,
    "home": 950
  }
];

