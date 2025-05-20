// Card Props section here
export type PriceCard = {
  label: string;
  description: string;
  price: string;
  priceSuffix: string;
  points: string[];
  href: string;
  popular?: boolean;
  isSelected: boolean;
  onClick: () => void;
};

export type ProgressCard = {
  steps: string[];
  currentStep?: number;
  onStepChange?: (event: { step: number }) => void;
};

export type ScheduleCard = {
  title: string;
  description: string;
  imageSrc: string;
};

export type StatusCard = {
  steps: string[];
  currentStep: number;
};

// UI Component Prop section here
export type DropdownFilter = {
  items: string[];
  direction?: "up" | "down";
  placeholder?: string;
  selectedItems: string[];
  onChange: (selected: string[]) => void;
};

export type Maps = {
  apiKey: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onStateChange?: (state: {
    center: google.maps.LatLngLiteral;
    zoom: number;
  }) => void;
};

// Weather Prop section here
export type Coordinates = {
  lat?: number;
  lon?: number;
};

// Layout component Props
export type SidebarProp = {
  view?: string;
  onClose: () => void;
  onSubmit?: (values: Record<string, string>) => void;
  formTitle?: string;
  warehouseId?: number;
};

// Left sidebar
export type Sidebar = {
  isOpen: boolean;
  userId?: string;
  onSectionChange?: (section: string) => void;
};

// Notification Props
type Notification = {
  title: string;
  description: string;
};

export type NotificationBar = {
  notifications: Notification[];
  isOpen: boolean;
  closeNotificationBar: () => void;
  onClearAll?: () => void;
  userId: string;
};

// Navbar component props
export type User = {
  name: string;
  email: string;
  business: string;
  imageUrl: string;
};

export type Navbar = {
  imageSrc?: string;
  userId: string;
};

// NavPanel component Props
type ButtonData = {
  name: string;
  view: string;
};

export type NavPanel = {
  buttons: ButtonData[];
  activeView: string;
  onNavigate: (view: string) => void;
};

// Modal Props
export type OTPModal = {
  isOpen: boolean;
  email: string;
  onValidate: (otp: string) => void;
  onClose: () => void;
};
