declare module "lucide-react" {
  import * as React from "react";

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
    className?: string;
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const ShieldAlert: LucideIcon;
  export const Activity: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const BookOpen: LucideIcon;
  export const UploadCloud: LucideIcon;
  export const FileText: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const AlertOctagon: LucideIcon;
  export const OctagonAlert: LucideIcon;
  export const Heart: LucideIcon;
  export const Clock: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Copy: LucideIcon;
  export const Check: LucideIcon;
  export const Languages: LucideIcon;
  export const HeartPulse: LucideIcon;
  export const Pill: LucideIcon;
  export const Stethoscope: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const Info: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Eye: LucideIcon;
  export const FileCode2: LucideIcon;
  export const Volume2: LucideIcon;
  export const Phone: LucideIcon;
  export const PhoneCall: LucideIcon;
  export const User: LucideIcon;
  export const LogIn: LucideIcon;
  export const LogOut: LucideIcon;
  export const Lock: LucideIcon;
  export const Mail: LucideIcon;
  export const Key: LucideIcon;
  export const X: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Send: LucideIcon;
  export const Bot: LucideIcon;
  export const Plus: LucideIcon;
  export const Trash2: LucideIcon;
  export const Paperclip: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Zap: LucideIcon;
  export const FileSearch: LucideIcon;
  export const Shield: LucideIcon;
  export const Globe: LucideIcon;
  export const FolderClock: LucideIcon;
  export const Search: LucideIcon;
  export const Filter: LucideIcon;
  export const ArrowUpDown: LucideIcon;
  export const Download: LucideIcon;
  export const BarChart3: LucideIcon;
  export const SlidersHorizontal: LucideIcon;
  export const Table: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const Layers: LucideIcon;
  export const Calendar: LucideIcon;
  export const RotateCcw: LucideIcon;

  const icons: Record<string, LucideIcon>;
  export default icons;
}

