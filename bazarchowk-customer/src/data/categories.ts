export interface SubCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  subcategories: SubCategory[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'daily-essentials',
    name: 'Daily Essentials',
    icon: 'cart-outline',
    color: '#00B140', // Green
    bgColor: '#E6F7ED',
    subcategories: [
      { id: 'grocery', name: 'Grocery' },
      { id: 'fruits-veg', name: 'Fruits & Vegetables' },
      { id: 'dairy-milk', name: 'Dairy & Milk' },
      { id: 'meat-fish', name: 'Meat & Fish' },
      { id: 'bakery', name: 'Bakery' },
      { id: 'sweets', name: 'Sweets & Mithai' },
      { id: 'water', name: 'Water Delivery' },
      { id: 'pets', name: 'Pet Supplies' },
    ]
  },
  {
    id: 'food-restaurants',
    name: 'Food & Dining',
    icon: 'restaurant-outline',
    color: '#F59E0B', // Orange
    bgColor: '#FEF3C7',
    subcategories: [
      { id: 'restaurants', name: 'Restaurants' },
      { id: 'fast-food', name: 'Fast Food' },
      { id: 'cafe', name: 'Cafe' },
      { id: 'tea-snacks', name: 'Tea & Snacks' },
      { id: 'tiffin', name: 'Tiffin Service' },
      { id: 'cloud-kitchen', name: 'Cloud Kitchen' },
      { id: 'street-food', name: 'Street Food' },
      { id: 'juice', name: 'Juice & Shakes' },
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: 'medkit-outline',
    color: '#EF4444', // Red
    bgColor: '#FEE2E2',
    subcategories: [
      { id: 'pharmacy', name: 'Pharmacy' },
      { id: 'hospital', name: 'Hospital' },
      { id: 'clinic', name: 'Clinic' },
      { id: 'doctor', name: 'Doctor Appointment' },
      { id: 'diagnostic', name: 'Diagnostic Lab' },
      { id: 'nursing', name: 'Nursing Care' },
      { id: 'physio', name: 'Physiotherapy' },
    ]
  },
  {
    id: 'beauty-personal-care',
    name: 'Beauty & Salon',
    icon: 'cut-outline',
    color: '#8B5CF6', // Purple
    bgColor: '#EDE9FE',
    subcategories: [
      { id: 'salon', name: 'Salon' },
      { id: 'spa', name: 'Spa' },
      { id: 'barber', name: 'Barber Shop' },
      { id: 'parlour', name: 'Beauty Parlour' },
      { id: 'makeup', name: 'Makeup Artist' },
      { id: 'bridal', name: 'Bridal Services' },
      { id: 'tattoo', name: 'Tattoo Studio' },
    ]
  },
  {
    id: 'home-services',
    name: 'Home Services',
    icon: 'home-outline',
    color: '#3B82F6', // Blue
    bgColor: '#DBEAFE',
    subcategories: [
      { id: 'electrician', name: 'Electrician' },
      { id: 'plumber', name: 'Plumber' },
      { id: 'carpenter', name: 'Carpenter' },
      { id: 'painter', name: 'Painter' },
      { id: 'ac-repair', name: 'AC Repair' },
      { id: 'appliance', name: 'Appliance Repair' },
      { id: 'cleaning', name: 'Cleaning Service' },
      { id: 'pest-control', name: 'Pest Control' },
    ]
  },
  {
    id: 'events-celebrations',
    name: 'Events & Parties',
    icon: 'gift-outline',
    color: '#EC4899', // Pink
    bgColor: '#FCE7F3',
    subcategories: [
      { id: 'cake', name: 'Cake Shop' },
      { id: 'flowers', name: 'Flower Shop' },
      { id: 'photo', name: 'Photographer' },
      { id: 'video', name: 'Videographer' },
      { id: 'dj', name: 'DJ Service' },
      { id: 'event-planner', name: 'Event Planner' },
      { id: 'birthday', name: 'Birthday Planner' },
    ]
  },
  {
    id: 'transport',
    name: 'Transport & Travel',
    icon: 'car-outline',
    color: '#14B8A6', // Teal
    bgColor: '#CCFBF1',
    subcategories: [
      { id: 'taxi', name: 'Taxi' },
      { id: 'auto', name: 'Auto Rickshaw' },
      { id: 'bike-taxi', name: 'Bike Taxi' },
      { id: 'bus', name: 'Bus Booking' },
      { id: 'travel', name: 'Travel Agency' },
      { id: 'rental', name: 'Car Rental' },
    ]
  },
  {
    id: 'retail',
    name: 'Retail & Shopping',
    icon: 'bag-handle-outline',
    color: '#6366F1', // Indigo
    bgColor: '#E0E7FF',
    subcategories: [
      { id: 'clothing', name: 'Clothing Store' },
      { id: 'footwear', name: 'Footwear' },
      { id: 'mobile', name: 'Mobile Shop' },
      { id: 'electronics', name: 'Electronics' },
      { id: 'furniture', name: 'Furniture' },
      { id: 'hardware', name: 'Hardware Store' },
      { id: 'gift', name: 'Gift Shop' },
      { id: 'books', name: 'Book Store' },
    ]
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    icon: 'leaf-outline',
    color: '#84CC16', // Lime
    bgColor: '#ECFCCB',
    subcategories: [
      { id: 'seeds', name: 'Seeds' },
      { id: 'fertilizers', name: 'Fertilizers' },
      { id: 'pesticides', name: 'Pesticides' },
      { id: 'tractor', name: 'Tractor Rental' },
      { id: 'farm-equip', name: 'Farm Equipment' },
      { id: 'vet', name: 'Veterinary Services' },
    ]
  },
  {
    id: 'religious',
    name: 'Religious & Events',
    icon: 'flame-outline',
    color: '#F97316', // Orange
    bgColor: '#FFEDD5',
    subcategories: [
      { id: 'pandit', name: 'Pandit Booking' },
      { id: 'pooja', name: 'Pooja Samagri' },
      { id: 'temple', name: 'Temple Services' },
      { id: 'maulvi', name: 'Maulvi Booking' },
      { id: 'priest', name: 'Priest Services' },
      { id: 'tent', name: 'Tent House & Decor' },
      { id: 'catering', name: 'Catering' },
    ]
  },
  {
    id: 'education',
    name: 'Education',
    icon: 'school-outline',
    color: '#66736B', // Slate
    bgColor: '#EAF8F0',
    subcategories: [
      { id: 'tutor', name: 'Tutor' },
      { id: 'coaching', name: 'Coaching Institute' },
      { id: 'school', name: 'School' },
      { id: 'college', name: 'College' },
      { id: 'computer', name: 'Computer Training' },
      { id: 'music', name: 'Music Classes' },
    ]
  },
  {
    id: 'professional',
    name: 'Professional Services',
    icon: 'briefcase-outline',
    color: '#0EA5E9', // Sky
    bgColor: '#E0F2FE',
    subcategories: [
      { id: 'ca', name: 'Chartered Accountant' },
      { id: 'lawyer', name: 'Lawyer' },
      { id: 'insurance', name: 'Insurance Agent' },
      { id: 'real-estate', name: 'Real Estate' },
      { id: 'documentation', name: 'Documentation Services' },
      { id: 'cyber', name: 'Cyber Cafe' },
    ]
  },
  {
    id: 'emergency',
    name: 'Emergency Services',
    icon: 'warning-outline',
    color: '#DC2626', // Red dark
    bgColor: '#FEE2E2',
    subcategories: [
      { id: 'ambulance', name: 'Ambulance' },
      { id: 'tow', name: 'Tow Truck' },
      { id: 'locksmith', name: 'Locksmith' },
      { id: 'em-electrician', name: 'Emergency Electrician' },
      { id: 'em-plumber', name: 'Emergency Plumber' },
    ]
  }
];
