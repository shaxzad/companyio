import './index.css';
import { PropsWithChildren, ReactNode } from 'react';

export type AppShellProps = PropsWithChildren<{
  productName: string;
  navigation?: ReactNode;
  actions?: ReactNode;
  sidebar?: ReactNode;
}>;

export const AppShell = ({
  productName,
  navigation,
  actions,
  sidebar,
  children,
}: AppShellProps) => (
  <div className="platform-shell">
    <header className="platform-header">
      <a className="platform-brand" href="/" aria-label={`${productName} home`}>
        {productName}
      </a>
      <nav aria-label="Primary navigation">{navigation}</nav>
      <div className="platform-actions">{actions}</div>
    </header>
    <div className="platform-body">
      {sidebar && <aside className="platform-sidebar">{sidebar}</aside>}
      <main className="platform-content">{children}</main>
    </div>
  </div>
);

export { ProductGrid } from './ProductGrid';
export { cn } from './lib/utils';
export { Alert, AlertTitle, AlertDescription, alertVariants } from './components/ui/alert';
export { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';
export { Badge, badgeVariants, type BadgeProps } from './components/ui/badge';
export { Button, buttonVariants, type ButtonProps } from './components/ui/button';
export { Button as ButtonGroup } from './components/ui/button';
export { Input, type InputProps } from './components/ui/input';
export { Label } from './components/ui/label';
export { FormField, type FormFieldProps } from './components/ui/form-field';
export { DataTable, type DataTableColumn, type DataTableProps } from './components/ui/data-table';
export { ConfirmDialog, type ConfirmDialogProps } from './components/ui/confirm-dialog';
export {
  ActionSpinner,
  KpiCard,
  LiveBadge,
  Notice,
  PageHeader,
  PageShell,
  QuickAction,
  Surface,
  SurfaceHeader,
  pageEyebrowClass,
  pageSubClass,
  pageTitleClass,
  primaryActionClass,
  secondaryActionClass,
  submitActionLabel,
  surfaceClass,
} from './components/ui/page';
export { AppToaster, toast } from './components/ui/toast';
export { useConfirmDialog, type ConfirmRequest } from './hooks/useConfirmDialog';
export { Table, TableHeader, TableBody, TableRow, TableCell } from './components/ui/table/index';
export { Separator } from './components/ui/separator';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/ui/dropdown-menu';
export { default as ResponsiveImage } from './components/ui/images/ResponsiveImage';
export { default as ThreeColumnImageGrid } from './components/ui/images/ThreeColumnImageGrid';
export { default as TwoColumnImageGrid } from './components/ui/images/TwoColumnImageGrid';
export { Modal } from './components/ui/modal/index';
export { default as Notification } from './components/header/Header';
export { default as NotificationDropdown } from './components/header/NotificationDropdown';
export { default as UserDropdown } from './components/header/UserDropdown';
export { default as BasicTableOne } from './components/tables/BasicTables/BasicTableOne';
export { default as SignInForm } from './components/auth/SignInForm';
export { default as SignUpForm } from './components/auth/SignUpForm';
export { default as BarChartOne } from './components/charts/bar/BarChartOne';
export { default as LineChartOne } from './components/charts/line/LineChartOne';
export { default as ChartTab } from './components/common/ChartTab';
export { default as ComponentCard } from './components/common/ComponentCard';
export { default as GridShape } from './components/common/GridShape';
export { default as PageBreadcrumb } from './components/common/PageBreadCrumb';
export { default as PageMeta } from './components/common/PageMeta';
export { ScrollToTop } from './components/common/ScrollToTop';
export { ThemeToggleButton } from './components/common/ThemeToggleButton';
export { default as ThemeTogglerTwo } from './components/common/ThemeTogglerTwo';
export { default as CountryMap } from './components/ecommerce/CountryMap';
export { default as DemographicCard } from './components/ecommerce/DemographicCard';
export { default as EcommerceMetrics } from './components/ecommerce/EcommerceMetrics';
export { default as MonthlySalesChart } from './components/ecommerce/MonthlySalesChart';
export { default as MonthlyTarget } from './components/ecommerce/MonthlyTarget';
export { default as RecentOrders } from './components/ecommerce/RecentOrders';
export { default as StatisticsChart } from './components/ecommerce/StatisticsChart';
// Form
export { default as CheckboxComponents } from './components/form/form-elements/CheckboxComponents';
export { default as DefaultInputs } from './components/form/form-elements/DefaultInputs';
export { default as DropzoneComponent } from './components/form/form-elements/DropZone';
export { default as FileInputExample } from './components/form/form-elements/FileInputExample';
export { default as InputGroup } from './components/form/form-elements/InputGroup';
export { default as InputStates } from './components/form/form-elements/InputStates';
export { default as RadioButtons } from './components/form/form-elements/RadioButtons';
export { default as SelectInputs } from './components/form/form-elements/SelectInputs';
export { default as TextAreaInput } from './components/form/form-elements/TextAreaInput';
export { default as ToggleSwitch } from './components/form/form-elements/ToggleSwitch';
export { default as PhoneInput } from './components/form/group-input/PhoneInput';
export { default as Checkbox } from './components/form/input/Checkbox';
export { default as FileInput } from './components/form/input/FileInput';
export { default as Radio } from './components/form/input/Radio';
export { default as RadioSm } from './components/form/input/RadioSm';
export { default as TextArea } from './components/form/input/TextArea';
export { default as Switch } from './components/form/switch/Switch';
export { default as DatePicker, type DatePickerProps } from './components/form/date-picker';
export { default as Form } from './components/form/Form';
export { default as MultiSelect } from './components/form/MultiSelect';
export { default as Select } from './components/form/Select';
// Video
export { default as AspectRatioVideo } from './components/ui/videos/AspectRatioVideo';
export { default as FourIsToThree } from './components/ui/videos/FourIsToThree';
export { default as OneIsToOne } from './components/ui/videos/OneIsToOne';
export { default as SixteenIsToNine } from './components/ui/videos/SixteenIsToNine';
export { default as TwentyOneIsToNine } from './components/ui/videos/TwentyOneIsToNine';
// UserProfile
export { default as UserAddressCard } from './components/UserProfile/UserAddressCard';
export { default as UserInfoCard } from './components/UserProfile/UserInfoCard';
export { default as UserMetaCard } from './components/UserProfile/UserMetaCard';
// Sidebar
export { SidebarProvider } from './context/SidebarContext';
export { ThemeProvider, useTheme } from './context/ThemeContext';
export type { Theme, ThemeMode } from './context/ThemeContext';
export { AppWrapper } from './components/common/PageMeta';

// Hooks
export { default as useGoBack } from './hooks/useGoBack';
export { useModal } from './hooks/useModal';
export { default as AppHeader } from './layout/AppHeader';
export { default as LayoutContent } from './layout/AppLayout';
export { default as AppLayout } from './layout/AppLayout';
export { default as AppSidebar } from './layout/AppSidebar';
export { default as Backdrop } from './layout/Backdrop';
export { ThemeModeSwitcher } from './components/header/ThemeModeSwitcher';
// Calender
export { default as FullCalendar } from '@fullcalendar/react';
export { default as dayGridPlugin } from '@fullcalendar/daygrid';
export { default as timeGridPlugin } from '@fullcalendar/timegrid';
export { default as interactionPlugin } from '@fullcalendar/interaction';
export type { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core';
export {
  DownloadIcon,
  BellIcon,
  MoreDotIcon,
  FileIcon,
  GridIcon,
  AudioIcon,
  VideoIcon,
  BoltIcon,
  PlusIcon,
  BoxIcon,
  CloseIcon,
  CheckCircleIcon,
  AlertIcon,
  InfoIcon,
  ErrorIcon,
  ArrowUpIcon,
  FolderIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  GroupIcon,
  BoxIconLine,
  ShootingStarIcon,
  DollarLineIcon,
  TrashBinIcon,
  AngleUpIcon,
  AngleDownIcon,
  PencilIcon,
  CheckLineIcon,
  CloseLineIcon,
  ChevronDownIcon,
  PaperPlaneIcon,
  EnvelopeIcon,
  LockIcon,
  UserIcon,
  CalenderIcon,
  EyeIcon,
  EyeCloseIcon,
  TimeIcon,
  CopyIcon,
  ChevronLeftIcon,
  UserCircleIcon,
  ListIcon,
  TableIcon,
  PageIcon,
  TaskIcon,
  PieChartIcon,
  BoxCubeIcon,
  PlugInIcon,
  DocsIcon,
  MailIcon,
  HorizontaLDots,
  ChevronUpIcon,
  ChatIcon,
} from './icons/index';

export type { ProductTile } from './ProductGrid';

export type {
  HeaderConfig,
  HeaderIconAction,
  HeaderMenuItem,
  HeaderMenuLink,
  HeaderNotification,
  HeaderSearchConfig,
  HeaderStatusBadge,
  HeaderUser,
  LayoutConfig,
  LayoutMenuPosition,
  SidebarConfig,
  SidebarNavItem,
  SidebarProjectDetails,
  SidebarSubItem,
} from './layout/types';
export { filterSidebarItems, hasMenuPermission } from './layout/types';

export type {
  ApplyRouteOptions,
  AppRouteAuth,
  AppRouteLazyComponent,
  AppRouteModule,
  BuildSidebarFromRoutesOptions,
  BuildRouterRoutesOptions,
  FilterRoutesOptions,
  MenuPosition,
  PersonRouteOptions,
  ResolvedAppRoute,
} from './routing';
export {
  MenuPositions,
  DEFAULT_MAIN_POSITIONS,
  DEFAULT_OTHERS_POSITIONS,
  buildRouterRoutes,
  buildSidebarFromRoutes,
  filterRoutes,
  flattenRoutes,
  listRoutableModules,
  resolveRouteVariant,
  routeMatchesVariant,
  routePermissions,
  toResolvedRoute,
} from './routing';
