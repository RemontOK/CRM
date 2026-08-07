import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import InventoryPartFormDialog from '../../components/Inventory/InventoryPartFormDialog';
import InventoryReceiptDialog from '../../components/Inventory/InventoryReceiptDialog';
import InventoryWriteoffDialog from '../../components/Inventory/InventoryWriteoffDialog';
import InventorySellDialog from '../../components/Inventory/InventorySellDialog';
import {
  PartFormState,
  ReceiptFormValues,
  SellFormValues,
  WriteoffFormValues,
  emptyPartForm,
} from '../../components/Inventory/inventoryPartFormTypes';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Delete,
  Edit,
  FilterList,
  ImportExport,
  Inventory,
  LocalShipping,
  ReceiptLong,
  Search,
  Visibility,
  Warning,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Order, OrderPart, Part, StockMovement, TaxonomyNode } from '../../types';
import { appSettingsService } from '../../services/appSettingsService';
import { inventoryService } from '../../services/inventoryService';
import { taxonomyService } from '../../services/taxonomyService';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../hooks/useAuth';
import { warningPanelSx } from '../../styles/ui';
import DataExchangeDialog from '../../components/DataExchangeDialog/DataExchangeDialog';
import {
  INVENTORY_EXCHANGE_COLUMNS,
  exportInventoryRows,
  importInventoryRows,
  inventoryTemplateSamples,
} from '../../utils/inventoryExchange';

const INVENTORY_GRID_PAGE_SIZE_KEY = 'inventory_grid_rows_per_page_v1';
const INVENTORY_GRID_LAYOUT_KEY = 'inventory_grid_layout_v1';
const INVENTORY_LOCATION_FILTER_KEY = 'inventory_location_filter_v1';
const LEGACY_WAREHOUSE_FILTER_KEY = 'inventory_warehouse_filter_v1';
const CUSTOM_SUPPLIERS_STORAGE_KEY = 'inventory_custom_suppliers_v1';
const gridPageSizeOptions = [10, 50, 100];

type InventoryColumnLayout = {
  widths: Record<string, number>;
};

/** Относительные веса столбцов — в таблице пересчитываются в % от ширины контейнера */
const normalizeInventoryColumnWidths = (widths: Record<string, number>) => {
  const hasLegacyPixelWidths = Object.values(widths).some((value) => value > 50);
  if (hasLegacyPixelWidths) {
    return {};
  }
  const { location, warehouse, ...rest } = widths;
  return rest;
};

const inventoryDefaultColumnWidths: Record<string, number> = {
  name: 24,
  category: 14,
  model: 12,
  quantity: 8,
  wholesalePrice: 8,
  unitPrice: 8,
  supplier: 12,
  actions: 18,
};

const getSavedGridPageSize = (key: string) => {
  const value = Number(localStorage.getItem(key));
  return gridPageSizeOptions.includes(value) ? value : 10;
};

const getSavedCustomSuppliers = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_SUPPLIERS_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((supplier): supplier is string => typeof supplier === 'string') : [];
  } catch {
    return [];
  }
};

const getSavedLocationFilter = () => {
  const saved = localStorage.getItem(INVENTORY_LOCATION_FILTER_KEY);
  if (saved && saved !== 'all') {
    return saved;
  }
  const legacy = localStorage.getItem(LEGACY_WAREHOUSE_FILTER_KEY);
  if (legacy && legacy !== 'all') {
    return legacy;
  }
  return '';
};

const getPartDisplayModel = (part: Part) => {
  const brand = part.brand.trim();
  const model = part.model.trim();

  if (!brand) {
    return model;
  }

  if (!model) {
    return brand;
  }

  return model.toLowerCase().includes(brand.toLowerCase()) ? model : `${brand} ${model}`;
};

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [isPartDialogOpen, setIsPartDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isWriteoffDialogOpen, setIsWriteoffDialogOpen] = useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLocation, setFilterLocation] = useState(() => getSavedLocationFilter());
  const [newLocationName, setNewLocationName] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const ordersLoadedRef = useRef(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [partsData, setPartsData] = useState<Part[]>([]);
  const [dataExchangeOpen, setDataExchangeOpen] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [taxonomyNodes, setTaxonomyNodes] = useState<TaxonomyNode[]>([]);
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [partFormInitial, setPartFormInitial] = useState<PartFormState>(emptyPartForm);
  const [writeoffInitialMode, setWriteoffInitialMode] = useState<'manual' | 'order'>('manual');
  const [sellDefaultPrice, setSellDefaultPrice] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(() => getSavedGridPageSize(INVENTORY_GRID_PAGE_SIZE_KEY));
  const [inventoryPage, setInventoryPage] = useState(0);
  const [columnLayout, setColumnLayout] = useState<InventoryColumnLayout>(() => {
    try {
      const raw = localStorage.getItem(INVENTORY_GRID_LAYOUT_KEY);
      if (!raw) {
        return { widths: {} };
      }
      const parsed = JSON.parse(raw) as InventoryColumnLayout;
      return { widths: normalizeInventoryColumnWidths(parsed.widths || {}) };
    } catch {
      return { widths: {} };
    }
  });
  const [customSuppliers, setCustomSuppliers] = useState<string[]>(getSavedCustomSuppliers);
  const [crmSettings, setCrmSettings] = useState(() => appSettingsService.getSettings());
  const { user } = useAuth();

  useEffect(() => {
    localStorage.setItem(INVENTORY_GRID_LAYOUT_KEY, JSON.stringify(columnLayout));
  }, [columnLayout]);

  const getColumnWidth = (field: string) =>
    columnLayout.widths[field] || inventoryDefaultColumnWidths[field] || 12;

  const updateColumnWidth = (field: string, width: number) => {
    const safeWidth = Number.isFinite(width) ? Math.max(5, Math.min(40, width)) : 12;
    setColumnLayout((prev) => ({
      ...prev,
      widths: {
        ...prev.widths,
        [field]: safeWidth,
      },
    }));
  };

  const handleColumnResizeStart = (
    event: React.MouseEvent<HTMLDivElement>,
    field: string,
    fallbackWidth: number
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = getColumnWidth(field) || fallbackWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaWeight = (moveEvent.clientX - startX) / 10;
      updateColumnWidth(field, startWidth + deltaWeight);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const renderResizableHeader = (field: string, label: string) => (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <Typography variant="body2" fontWeight={700} noWrap>
        {label}
      </Typography>
      <Box
        onMouseDown={(event) =>
          handleColumnResizeStart(event, field, inventoryDefaultColumnWidths[field] || 120)
        }
        onClick={(event) => event.stopPropagation()}
        sx={{
          position: 'absolute',
          top: 0,
          right: -10,
          bottom: 0,
          width: 18,
          cursor: 'col-resize',
          zIndex: 4,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 12,
            bottom: 12,
            left: '50%',
            borderLeft: '1px solid rgba(15, 23, 42, 0.24)',
          },
          '&:hover::after': {
            borderLeftColor: 'rgba(234, 88, 12, 0.95)',
          },
        }}
      />
    </Box>
  );

  const formatPrice = (value: number) => `₽${Number(value || 0).toLocaleString('ru-RU')}`;

  const getRetailPrice = (part: Part) => {
    const retail = Number(part.unitPrice) || 0;
    if (retail > 0) {
      return retail;
    }
    return Number(part.wholesalePrice) || 0;
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const apiMessage = (error.response?.data as any)?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return fallback;
  };

  const refreshInventory = async () => {
    await Promise.all([taxonomyService.refreshFromApi(), inventoryService.refreshFromApi()]);
    setPartsData(inventoryService.getParts());
    setMovements(inventoryService.getMovements());
    setTaxonomyNodes(taxonomyService.getNodes('inventory'));
  };

  const loadOrdersForWriteoff = async () => {
    if (ordersLoadedRef.current) {
      return;
    }
    ordersLoadedRef.current = true;
    try {
      setOrdersData(await orderService.getOrders());
    } catch {
      ordersLoadedRef.current = false;
    }
  };

  useEffect(() => {
    setPartsData(inventoryService.getParts());
    setMovements(inventoryService.getMovements());
    setTaxonomyNodes(taxonomyService.getNodes('inventory'));
    void refreshInventory();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const nextSettings = await appSettingsService.refreshFromApi();
      setCrmSettings(nextSettings);
    };
    void loadSettings();
    const handleSettingsUpdated = () => setCrmSettings(appSettingsService.getSettings());
    window.addEventListener('crm:settings-updated', handleSettingsUpdated as EventListener);
    return () => window.removeEventListener('crm:settings-updated', handleSettingsUpdated as EventListener);
  }, []);

  const inventoryLocations = useMemo(() => {
    const fromSettings = (crmSettings.locations?.items || [])
      .map((item) => item.trim())
      .filter(Boolean);

    if (fromSettings.length > 0) {
      return fromSettings;
    }

    const fromWarehouses = (crmSettings.orders.warehouses || [])
      .map((warehouse) => (warehouse.name || '').trim())
      .filter(Boolean);

    if (fromWarehouses.length > 0) {
      return Array.from(new Set(fromWarehouses));
    }

    const fromParts = Array.from(
      new Set(
        partsData
          .map((part) => {
            const raw = (part.warehouseId || '').trim();
            if (!raw) {
              return '';
            }
            const warehouse = (crmSettings.orders.warehouses || []).find((item) => item.id === raw);
            return (warehouse?.name || raw).trim();
          })
          .filter(Boolean)
      )
    );

    return fromParts;
  }, [crmSettings.locations?.items, crmSettings.orders.warehouses, partsData]);

  const defaultLocation = inventoryLocations[0] || '';
  const activeLocationFilter = useMemo(() => {
    if (inventoryLocations.length === 0) {
      return '';
    }
    const candidate = (filterLocation || defaultLocation).trim();
    return inventoryLocations.includes(candidate) ? candidate : inventoryLocations[0];
  }, [defaultLocation, filterLocation, inventoryLocations]);

  useEffect(() => {
    setFilterLocation((current) => {
      if (inventoryLocations.length === 0) {
        return '';
      }
      const saved = getSavedLocationFilter();
      const preferred = current && current !== 'all' ? current : saved;
      const isValid = preferred && inventoryLocations.includes(preferred);
      const next = isValid ? preferred : inventoryLocations[0];
      if (next) {
        localStorage.setItem(INVENTORY_LOCATION_FILTER_KEY, next);
      }
      return next;
    });
  }, [inventoryLocations]);

  const resolvePartLocation = (part: Part) => {
    const value = (part.warehouseId || '').trim();
    if (!value) {
      return '';
    }
    if (inventoryLocations.includes(value)) {
      return value;
    }
    const legacyWarehouse = (crmSettings.orders.warehouses || []).find((warehouse) => warehouse.id === value);
    if (legacyWarehouse?.name && inventoryLocations.includes(legacyWarehouse.name)) {
      return legacyWarehouse.name;
    }
    return '';
  };

  const getEffectivePartLocation = (part: Part) => resolvePartLocation(part) || defaultLocation;

  const getLocationLabel = (location?: string) => {
    if (!location) {
      return '—';
    }
    if (inventoryLocations.includes(location)) {
      return location;
    }
    const legacyWarehouse = (crmSettings.orders.warehouses || []).find((warehouse) => warehouse.id === location);
    if (legacyWarehouse) {
      return legacyWarehouse.name;
    }
    return location;
  };

  const rootCategories = useMemo(() => taxonomyNodes.filter((node) => !node.parentId), [taxonomyNodes]);
  const getSubcategories = (parentId: string) => taxonomyNodes.filter((node) => node.parentId === parentId);

  const selectedCategoryNode = taxonomyNodes.find((node) => node.id === filterCategory);
  const selectedRootNode = selectedCategoryNode?.parentId
    ? taxonomyNodes.find((node) => node.id === selectedCategoryNode.parentId)
    : selectedCategoryNode;

  const getAlertThreshold = (part: Part) =>
    typeof part.alertThreshold === 'number' ? part.alertThreshold : part.minQuantity;

  const isPartLowStock = (part: Part) => inventoryService.isLowStock(part);

  const locationParts = useMemo(
    () =>
      activeLocationFilter
        ? partsData.filter((part) => getEffectivePartLocation(part) === activeLocationFilter)
        : [],
    [partsData, activeLocationFilter, defaultLocation, inventoryLocations]
  );

  const unassignedPartsCount = useMemo(
    () => locationParts.filter((part) => !resolvePartLocation(part)).length,
    [locationParts, inventoryLocations]
  );

  const stats = useMemo(
    () => ({
      totalParts: locationParts.length,
      lowStockParts: locationParts.filter((part) => isPartLowStock(part)).length,
      totalValue: locationParts.reduce(
        (sum, part) => sum + part.quantity * (part.wholesalePrice ?? part.unitPrice),
        0
      ),
      outOfStockParts: locationParts.filter((part) => part.quantity === 0).length,
    }),
    [locationParts]
  );

  const lowStockParts = useMemo(
    () => locationParts.filter((part) => isPartLowStock(part)),
    [locationParts]
  );
  const activeOrders = useMemo(
    () => ordersData.filter((order) => !['completed', 'cancelled'].includes(order.status)),
    [ordersData]
  );
  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...partsData.map((part) => part.supplier.trim()).filter(Boolean),
          ...customSuppliers.map((supplier) => supplier.trim()).filter(Boolean),
        ])
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [partsData, customSuppliers]
  );

  const filteredParts = useMemo(
    () =>
      partsData.filter((part) => {
        const matchesSearch =
          part.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          part.partNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          part.brand.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          part.model.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

        const matchesCategory =
          filterCategory === 'all' ||
          (selectedCategoryNode?.parentId
            ? part.category === selectedRootNode?.name && part.subcategory === selectedCategoryNode.name
            : part.category === selectedCategoryNode?.name);

        let matchesStatus = true;
        if (filterStatus === 'low') {
          matchesStatus = isPartLowStock(part);
        } else if (filterStatus === 'out') {
          matchesStatus = part.quantity === 0;
        } else if (filterStatus === 'normal') {
          matchesStatus = !isPartLowStock(part) && part.quantity > 0;
        }

        const matchesLocation =
          Boolean(activeLocationFilter) && getEffectivePartLocation(part) === activeLocationFilter;

        return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
      }),
    [partsData, debouncedSearchTerm, filterCategory, activeLocationFilter, filterStatus, selectedCategoryNode, selectedRootNode, defaultLocation, inventoryLocations]
  );

  const inventoryExchangeExportRows = useMemo(() => exportInventoryRows(filteredParts), [filteredParts]);

  const categoryStats = useMemo(
    () =>
      rootCategories.map((category) => ({
        category,
        count: locationParts.filter((part) => part.category === category.name).length,
        children: getSubcategories(category.id),
      })),
    [locationParts, rootCategories, taxonomyNodes]
  );

  const resetPartForm = () => {
    setEditingPartId(null);
    setPartFormInitial(emptyPartForm);
  };

  const rememberSupplier = (supplier: string) => {
    const normalizedSupplier = supplier.trim();

    if (!normalizedSupplier) {
      return;
    }

    setCustomSuppliers((prev) => {
      if (prev.some((item) => item.toLowerCase() === normalizedSupplier.toLowerCase())) {
        return prev;
      }

      const next = [...prev, normalizedSupplier].sort((a, b) => a.localeCompare(b, 'ru'));
      localStorage.setItem(CUSTOM_SUPPLIERS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const openCreatePartDialog = () => {
    setEditingPartId(null);
    const defaultPartLocation = activeLocationFilter || inventoryLocations[0] || '';
    setPartFormInitial({
      ...emptyPartForm,
      category: selectedCategoryNode?.parentId ? selectedRootNode?.name || '' : selectedCategoryNode?.name || '',
      subcategory: selectedCategoryNode?.parentId ? selectedCategoryNode.name : '',
      warehouseId: defaultPartLocation,
    });
    setIsPartDialogOpen(true);
  };

  const openViewDialog = (part: Part) => {
    setSelectedPart(part);
    setIsViewDialogOpen(true);
  };

  const openReceiptDialog = (part: Part) => {
    setSelectedPart(part);
    setIsReceiptDialogOpen(true);
  };

  const openWriteoffDialog = (part: Part, mode: 'manual' | 'order' = 'manual') => {
    setSelectedPart(part);
    setWriteoffInitialMode(mode);
    setIsWriteoffDialogOpen(true);
  };

  const openEditPartDialog = (part: Part) => {
    setEditingPartId(part.id);
    setPartFormInitial({
      partType: 'spare_part',
      name: part.name,
      partNumber: part.partNumber,
      category: part.category,
      subcategory: part.subcategory || '',
      brand: '',
      model: getPartDisplayModel(part),
      quantity: String(part.quantity),
      minQuantity: String(getAlertThreshold(part)),
      alertThreshold: String(getAlertThreshold(part)),
      notificationsEnabled: part.notificationsEnabled === true,
      wholesalePrice: String(part.wholesalePrice ?? 0),
      unitPrice: String(part.unitPrice || ''),
      supplier: part.supplier,
      description: part.description || '',
      warehouseId: part.warehouseId || '',
    });
    setIsViewDialogOpen(false);
    setIsPartDialogOpen(true);
  };

  const handleSavePart = async (partForm: PartFormState) => {
    if (!partForm.name.trim() || !partForm.category) {
      toast.error('Заполните обязательные поля');
      return;
    }

    const alertThreshold = Number(partForm.alertThreshold) || 0;
    const supplier = partForm.supplier.trim();

    const payload = {
      partType: 'spare_part' as const,
      name: partForm.name.trim(),
      partNumber: partForm.partNumber.trim() || `AUTO-${Date.now()}`,
      category: partForm.category,
      subcategory: partForm.subcategory || undefined,
      brand: '',
      model: partForm.model.trim(),
      description: partForm.description.trim(),
      quantity: Number(partForm.quantity) || 0,
      minQuantity: alertThreshold,
      alertThreshold,
      notificationsEnabled: Boolean(partForm.notificationsEnabled),
      wholesalePrice: Number(partForm.wholesalePrice) || 0,
      unitPrice: Number(partForm.unitPrice) || Number(partForm.wholesalePrice) || 0,
      supplier,
      supplierContact: '',
      location: partForm.warehouseId || activeLocationFilter || defaultLocation || '',
      warehouseId: partForm.warehouseId || undefined,
    };

    try {
      if (editingPartId) {
        await inventoryService.updatePart(editingPartId, payload);
      } else {
        await inventoryService.addPart(payload);
      }

      rememberSupplier(supplier);
      await refreshInventory();
      setIsPartDialogOpen(false);
      resetPartForm();
      toast.success(editingPartId ? 'Запчасть обновлена' : 'Запчасть добавлена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить запчасть'));
    }
  };

  const handleReceiveStock = async ({
    quantity: receiptQuantity,
    unitCost: receiptUnitCost,
    documentNumber: receiptDocumentNumber,
    reason: receiptReason,
  }: ReceiptFormValues) => {
    if (!selectedPart) {
      return;
    }

    const quantity = Number(receiptQuantity);
    const unitCost = Number(receiptUnitCost || selectedPart.wholesalePrice || selectedPart.unitPrice || 0);

    if (!quantity || quantity <= 0) {
      toast.error('Укажите количество для оприходования');
      return;
    }

    await inventoryService.addStock(
      selectedPart.id,
      quantity,
      receiptReason || 'Оприходование на склад',
      'Склад',
      unitCost,
      receiptDocumentNumber || undefined
    );

    if (unitCost > 0 && (selectedPart.wholesalePrice ?? selectedPart.unitPrice) !== unitCost) {
      await inventoryService.updatePart(selectedPart.id, { wholesalePrice: unitCost });
    }

    void refreshInventory();
    setIsReceiptDialogOpen(false);
    toast.success('Поступление по складу сохранено');
  };

  const handleWriteoffStock = async ({
    mode: writeoffMode,
    quantity: writeoffQuantity,
    reason: writeoffReason,
    orderId: writeoffOrderId,
  }: WriteoffFormValues) => {
    if (!selectedPart) {
      return;
    }

    const quantity = Number(writeoffQuantity);
    if (!quantity || quantity <= 0) {
      toast.error('Укажите количество для списания');
      return;
    }

    if (quantity > selectedPart.quantity) {
      toast.error(`Недостаточно остатка. Доступно: ${selectedPart.quantity} шт.`);
      return;
    }

    try {
      if (writeoffMode === 'order') {
        const targetOrder = activeOrders.find((order) => order.id === writeoffOrderId);
        if (!targetOrder) {
          toast.error('Выберите заказ');
          return;
        }

        await inventoryService.registerOutgoingMovement(
          selectedPart.id,
          quantity,
          `Списание в заказ ${targetOrder.orderNumber}`,
          targetOrder.orderNumber,
          'Склад'
        );

        const existingOrderPart = (targetOrder.parts || []).find((part) => part.partId === selectedPart.id);
        const nextParts: OrderPart[] = existingOrderPart
          ? (targetOrder.parts || []).map((part) =>
              part.partId === selectedPart.id
                ? {
                    ...part,
                    quantity: part.quantity + quantity,
                    totalPrice: (part.quantity + quantity) * part.unitPrice,
                  }
                : part
            )
          : [
              ...(targetOrder.parts || []),
              {
                id: `${targetOrder.id}-${selectedPart.id}-${Date.now()}`,
                partId: selectedPart.id,
                quantity,
                unitPrice: selectedPart.unitPrice,
                totalPrice: selectedPart.unitPrice * quantity,
                isUsed: true,
              },
            ];

        await orderService.updateOrder(targetOrder.id, { parts: nextParts });
        toast.success(`Запчасть списана в заказ ${targetOrder.orderNumber}`);
      } else {
        await inventoryService.registerOutgoingMovement(
          selectedPart.id,
          quantity,
          writeoffReason || 'Ручное списание',
          undefined,
          'Склад'
        );
        toast.success('Списание со склада сохранено');
      }

      await refreshInventory();
      setIsWriteoffDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось списать запчасть');
    }
  };

  const openSellDialog = (part: Part) => {
    setSelectedPart(part);
    setSellDefaultPrice(String(getRetailPrice(part)));
    setIsSellDialogOpen(true);
  };

  const handleSellItem = async ({
    quantity: saleQuantity,
    price: salePrice,
    paymentMethod: salePaymentMethod,
  }: SellFormValues) => {
    if (!selectedPart) return;

    const quantity = Number(saleQuantity);
    const price = Number(salePrice);
    if (!quantity || quantity <= 0) {
      toast.error('Укажите количество');
      return;
    }
    if (quantity > selectedPart.quantity) {
      toast.error(`Недостаточно остатка. Доступно: ${selectedPart.quantity} шт.`);
      return;
    }
    if (price < 0 || Number.isNaN(price)) {
      toast.error('Укажите корректную цену');
      return;
    }

    try {
      await inventoryService.registerOutgoingMovement(
        selectedPart.id,
        quantity,
        'Продажа товара',
        undefined,
        'Склад'
      );

      const { cashService } = await import('../../services/cashService');
      await cashService.addOperation({
        type: 'income',
        amount: quantity * price,
        description: `Продажа ${selectedPart.name} (${quantity} шт.)`,
        category: 'Продажа товаров',
        paymentMethod: salePaymentMethod,
        registerType: salePaymentMethod === 'card' ? 'bank_terminal' : salePaymentMethod === 'transfer' ? 'online' : 'cashbox',
        source: 'manual',
        processedBy: 'Склад',
      });

      await refreshInventory();
      setIsSellDialogOpen(false);
      toast.success('Продажа проведена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось провести продажу'));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      await taxonomyService.addNode('inventory', newCategoryName.trim(), newCategoryParentId || null);
      setNewCategoryName('');
      setNewCategoryParentId('');
      await refreshInventory();
      toast.success(newCategoryParentId ? 'Подкатегория добавлена' : 'Категория добавлена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить категорию'));
    }
  };

  const handleStartCategoryEdit = (node: TaxonomyNode) => {
    setEditingCategoryId(node.id);
    setEditingCategoryName(node.name);
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) {
      toast.error('Введите название категории');
      return;
    }

    try {
      const node = taxonomyNodes.find((item) => item.id === editingCategoryId);
      if (!node) {
        toast.error('Категория не найдена');
        return;
      }

      const oldName = node.name;
      const nextName = editingCategoryName.trim();
      await taxonomyService.updateNode(node.id, nextName);

      if (node.parentId) {
        const parentNode = taxonomyNodes.find((item) => item.id === node.parentId);
        if (parentNode) {
          const partsToUpdate = partsData.filter(
            (part) => part.category === parentNode.name && part.subcategory === oldName
          );
          await Promise.all(
            partsToUpdate.map((part) => inventoryService.updatePart(part.id, { subcategory: nextName }))
          );
        }
      } else {
        const partsToUpdate = partsData.filter((part) => part.category === oldName);
        await Promise.all(partsToUpdate.map((part) => inventoryService.updatePart(part.id, { category: nextName })));
      }

      setEditingCategoryId('');
      setEditingCategoryName('');
      await refreshInventory();
      toast.success('Категория обновлена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить категорию'));
    }
  };

  const handleDeleteCategory = async (nodeId: string) => {
    try {
      const node = taxonomyNodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      const childNodes = taxonomyNodes.filter((item) => item.parentId === node.id);
      const hasLinkedParts = node.parentId
        ? partsData.some((part) => {
            const parentNode = taxonomyNodes.find((item) => item.id === node.parentId);
            return parentNode
              ? part.category === parentNode.name && part.subcategory === node.name
              : false;
          })
        : partsData.some(
            (part) =>
              part.category === node.name ||
              childNodes.some((child) => part.category === node.name && part.subcategory === child.name)
          );

      if (hasLinkedParts) {
        toast.error('Сначала перенесите или отредактируйте запчасти в этой категории');
        return;
      }

      await taxonomyService.deleteNode(nodeId);
      await refreshInventory();
      toast.success('Категория удалена');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось удалить категорию'));
    }
  };

  const columns = useMemo(
    () => [
      { field: 'name', headerName: 'Название', width: getColumnWidth('name') },
      { field: 'category', headerName: 'Категория', width: getColumnWidth('category') },
      { field: 'model', headerName: 'Модель', width: getColumnWidth('model') },
      { field: 'quantity', headerName: 'Количество', width: getColumnWidth('quantity') },
      { field: 'wholesalePrice', headerName: 'Оптовая', width: getColumnWidth('wholesalePrice') },
      { field: 'unitPrice', headerName: 'Розничная', width: getColumnWidth('unitPrice') },
      { field: 'supplier', headerName: 'Поставщик', width: getColumnWidth('supplier') },
      { field: 'actions', headerName: 'Действия', width: getColumnWidth('actions') },
    ],
    [columnLayout.widths]
  );

  const totalInventoryPages = Math.max(1, Math.ceil(filteredParts.length / rowsPerPage));
  const safeInventoryPage = Math.min(inventoryPage, totalInventoryPages - 1);
  const paginatedParts = filteredParts.slice(
    safeInventoryPage * rowsPerPage,
    safeInventoryPage * rowsPerPage + rowsPerPage
  );
  const columnsTotalWeight = columns.reduce((total, column) => total + Number(column.width || 12), 0);

  const getColumnPercent = (width: number) =>
    `${((Number(width || 12) / columnsTotalWeight) * 100).toFixed(4)}%`;

  const renderPartCell = (field: string, part: Part) => {
    switch (field) {
      case 'name':
        return (
          <Box>
            <Typography variant="body2" fontWeight={700} noWrap>
              {part.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {part.partNumber}
            </Typography>
          </Box>
        );
      case 'category':
        return (
          <Chip
            label={part.subcategory ? `${part.category} / ${part.subcategory}` : part.category}
            color="primary"
            size="small"
            sx={{
              maxWidth: '100%',
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            }}
          />
        );
      case 'model':
        return (
          <Typography variant="body2" noWrap>
            {getPartDisplayModel(part) || '—'}
          </Typography>
        );
      case 'quantity': {
        const isLowStock = isPartLowStock(part);
        const isOutOfStock = part.quantity === 0;
        return (
          <Box display="flex" alignItems="center">
            <Typography
              variant="body2"
              color={isOutOfStock ? 'error.main' : isLowStock ? 'warning.main' : 'success.main'}
              fontWeight={700}
            >
              {part.quantity}
            </Typography>
            {isLowStock && <Warning sx={{ ml: 1, color: 'warning.main', fontSize: 16 }} />}
          </Box>
        );
      }
      case 'wholesalePrice':
        return (
          <Typography variant="body2" fontWeight={700} color="text.secondary" noWrap>
            {formatPrice(Number(part.wholesalePrice) || 0)}
          </Typography>
        );
      case 'unitPrice':
        return (
          <Typography variant="body2" fontWeight={700} noWrap>
            {formatPrice(getRetailPrice(part))}
          </Typography>
        );
      case 'supplier':
        return (
          <Typography variant="body2" noWrap>
            {part.supplier || '—'}
          </Typography>
        );
      case 'actions':
        return (
          <Box
            onClick={(event) => event.stopPropagation()}
            sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', mx: -0.75 }}
          >
            <IconButton size="small" sx={{ p: 0.4 }} onClick={() => openViewDialog(part)} title="Просмотр">
              <Visibility sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" sx={{ p: 0.4 }} onClick={() => openWriteoffDialog(part, 'manual')} title="Списать">
              <LocalShipping sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" sx={{ p: 0.4 }} onClick={() => openReceiptDialog(part)} title="Оприходовать">
              <Add sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" sx={{ p: 0.4 }} onClick={() => openSellDialog(part)} title="Продать">
              <ReceiptLong sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" sx={{ p: 0.4 }} onClick={() => openEditPartDialog(part)} title="Изменить">
              <Edit sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              sx={{ p: 0.4 }}
              title="Удалить"
              onClick={async () => {
                await inventoryService.deletePart(part.id);
                await refreshInventory();
                toast.success('Запчасть удалена');
              }}
            >
              <Delete sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        );
      default:
        return null;
    }
  };

  const handleAddLocationFromInventory = async (preset?: string) => {
    const value = (preset ?? newLocationName).trim();
    if (!value) {
      toast.error('Введите название локации');
      return;
    }
    if (inventoryLocations.includes(value)) {
      toast.error('Такая локация уже есть');
      return;
    }

    setIsAddingLocation(true);
    try {
      const nextSettings = {
        ...crmSettings,
        locations: {
          items: [...(crmSettings.locations?.items || []), value],
        },
      };
      const saved = await appSettingsService.saveSettings(nextSettings);
      setCrmSettings(saved);
      setFilterLocation(value);
      localStorage.setItem(INVENTORY_LOCATION_FILTER_KEY, value);
      setNewLocationName('');
      toast.success(`Локация «${value}» добавлена`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить локацию'));
    } finally {
      setIsAddingLocation(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Typography variant="h4" fontWeight={700}>
            Склад
          </Typography>
        </Stack>
        {inventoryLocations.length === 0 ? (
          <Card variant="outlined" sx={{ maxWidth: 560, p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Локация склада не настроена
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Добавьте первую точку — без неё нельзя выбрать склад и привязать запчасти.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Например: Основной склад"
                value={newLocationName}
                onChange={(event) => setNewLocationName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleAddLocationFromInventory();
                  }
                }}
                disabled={isAddingLocation}
              />
              <Button
                variant="contained"
                onClick={() => void handleAddLocationFromInventory()}
                disabled={isAddingLocation}
                sx={{ flexShrink: 0 }}
              >
                {isAddingLocation ? 'Сохранение...' : 'Добавить'}
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="text"
                disabled={isAddingLocation}
                onClick={() => void handleAddLocationFromInventory('Основной склад')}
              >
                Основной склад
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => navigate('/settings?section=locations')}
                disabled={isAddingLocation}
              >
                Все локации в настройках
              </Button>
            </Stack>
          </Card>
        ) : (
          <FormControl size="small" sx={{ width: { xs: '100%', sm: 320 } }}>
            <InputLabel id="inventory-location-filter-label">Локация</InputLabel>
            <Select
              labelId="inventory-location-filter-label"
              id="inventory-location-filter"
              label="Локация"
              value={activeLocationFilter}
              onChange={(e) => {
                const value = e.target.value;
                setFilterLocation(value);
                localStorage.setItem(INVENTORY_LOCATION_FILTER_KEY, value);
                setInventoryPage(0);
              }}
              MenuProps={{
                disablePortal: false,
                PaperProps: { sx: { maxHeight: 320 } },
              }}
            >
              {inventoryLocations.map((location) => (
                <MenuItem key={location} value={location}>
                  {location}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      {inventoryLocations.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          После добавления локации вы сможете выбирать склад в списке и фильтровать запчасти по точке.
        </Alert>
      )}

      {unassignedPartsCount > 0 && activeLocationFilter === defaultLocation && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {unassignedPartsCount}{' '}
          {unassignedPartsCount === 1 ? 'позиция показана' : 'позиций показано'} без привязки к локации — отображаются в «
          {defaultLocation}». Укажите локацию при редактировании запчасти.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Всего запчастей
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {stats.totalParts}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Inventory />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Низкий остаток
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="warning.main">
                      {stats.lowStockParts}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Warning />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Общая стоимость
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      ₽{stats.totalValue.toLocaleString('ru-RU')}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <CheckCircle />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Нет в наличии
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="error.main">
                      {stats.outOfStockParts}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <LocalShipping />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        {lowStockParts.length > 0 && (
          <Grid item xs={12}>
            <Card sx={warningPanelSx}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  ⚠️ Внимание! Низкий остаток запчастей
                </Typography>
                <Grid container spacing={1}>
                  {lowStockParts.map((part) => (
                    <Grid item key={part.id}>
                      <Box
                        sx={(theme) => ({
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff',
                          border: '1px solid',
                          borderColor: theme.palette.mode === 'dark' ? 'warning.main' : '#fb923c',
                          borderRadius: 2,
                          overflow: 'hidden',
                        })}
                      >
                        <Button
                          size="small"
                          onClick={() => openReceiptDialog(part)}
                          sx={(theme) => ({
                            color: theme.palette.mode === 'dark' ? 'warning.light' : '#9a3412',
                            fontWeight: 700,
                            px: 1.5,
                            textTransform: 'none',
                            '&:hover': {
                              bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : '#ffedd5',
                            },
                          })}
                        >
                          {`${part.name} (${part.quantity}/${getAlertThreshold(part)})`}
                        </Button>
                        <IconButton
                          size="small"
                          title="Редактировать запчасть"
                          onClick={() => openEditPartDialog(part)}
                          sx={{
                            color: '#c2410c',
                            borderLeft: '1px solid #fed7aa',
                            borderRadius: 0,
                            '&:hover': { bgcolor: '#ffedd5' },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Категории склада
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Быстрый выбор категории и подкатегории для работы по складу.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setIsCategoryDialogOpen(true)}
                sx={{ mb: 2 }}
              >
                Управлять категориями
              </Button>
              <Stack spacing={1.25}>
                <Button
                  fullWidth
                  variant={filterCategory === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setFilterCategory('all')}
                  sx={{ justifyContent: 'space-between', px: 2 }}
                >
                  <span>Все категории</span>
                  <strong>{partsData.length}</strong>
                </Button>
                {categoryStats.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 0.5 }}>
                    Категорий пока нет. Создайте их через «Управлять категориями» или в начальной настройке.
                  </Alert>
                ) : (
                  categoryStats.map((item) => (
                  <Box key={item.category.id}>
                    <Button
                      fullWidth
                      variant={filterCategory === item.category.id ? 'contained' : 'outlined'}
                      onClick={() => setFilterCategory(item.category.id)}
                      sx={{ justifyContent: 'space-between', px: 2 }}
                    >
                      <span>{item.category.name}</span>
                      <strong>{item.count}</strong>
                    </Button>
                    {item.children.length > 0 && (
                      <Stack spacing={1} sx={{ ml: 2, mt: 1 }}>
                        {item.children.map((child) => (
                          <Button
                            key={child.id}
                            fullWidth
                            size="small"
                            variant={filterCategory === child.id ? 'contained' : 'text'}
                            onClick={() => setFilterCategory(child.id)}
                            sx={{ justifyContent: 'space-between', px: 1.5 }}
                          >
                            <span>{child.name}</span>
                            <strong>
                              {
                                partsData.filter(
                                  (part) => part.category === item.category.name && part.subcategory === child.name
                                ).length
                              }
                            </strong>
                          </Button>
                        ))}
                      </Stack>
                    )}
                  </Box>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={9}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Поиск запчастей..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Категория</InputLabel>
                    <Select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      label="Категория"
                    >
                      <MenuItem value="all">Все</MenuItem>
                      {rootCategories.map((category) => [
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>,
                        ...getSubcategories(category.id).map((child) => (
                          <MenuItem key={child.id} value={child.id}>
                            {`${category.name} / ${child.name}`}
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>Статус</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Статус"
                    >
                      <MenuItem value="all">Все</MenuItem>
                      <MenuItem value="normal">Норма</MenuItem>
                      <MenuItem value="low">Низкий остаток</MenuItem>
                      <MenuItem value="out">Нет в наличии</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => {
                      setSearchTerm('');
                      setFilterCategory('all');
                      setFilterStatus('all');
                      setInventoryPage(0);
                    }}
                  >
                    Сбросить
                  </Button>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<ImportExport />}
                    onClick={() => setDataExchangeOpen(true)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Импорт / экспорт
                  </Button>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={openCreatePartDialog}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                  >
                    Добавить запчасть
                  </Button>
                </Grid>
              </Grid>

              <Box sx={{ width: '100%', overflow: 'hidden', border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 2 }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                  }}
                >
                  <colgroup>
                    {columns.map((column) => (
                      <col key={column.field} style={{ width: getColumnPercent(column.width) }} />
                    ))}
                  </colgroup>
                  <Box component="thead" sx={{ bgcolor: 'var(--crm-panel)' }}>
                    <Box component="tr">
                      {columns.map((column) => (
                        <Box
                          component="th"
                          key={column.field}
                          sx={{
                            position: 'relative',
                            height: 48,
                            px: 1,
                            textAlign: 'left',
                            borderBottom: '1px solid var(--crm-border)',
                            color: 'text.secondary',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            overflow: 'hidden',
                          }}
                        >
                          {renderResizableHeader(column.field, column.headerName)}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {paginatedParts.map((part) => (
                      <Box
                        component="tr"
                        key={part.id}
                        onClick={() => openViewDialog(part)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'rgba(15, 23, 42, 0.025)',
                          },
                        }}
                      >
                        {columns.map((column) => (
                          <Box
                            component="td"
                            key={`${part.id}-${column.field}`}
                            sx={{
                              height: 48,
                              px: 1,
                              py: 0.5,
                              borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                              verticalAlign: 'middle',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {renderPartCell(column.field, part)}
                          </Box>
                        ))}
                      </Box>
                    ))}
                    {paginatedParts.length === 0 && (
                      <Box component="tr">
                        <Box
                          component="td"
                          colSpan={columns.length}
                          sx={{
                            py: 4,
                            textAlign: 'center',
                            color: 'text.secondary',
                            borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
                          }}
                        >
                          {activeLocationFilter
                            ? `Нет позиций в локации «${getLocationLabel(activeLocationFilter)}»`
                            : 'Выберите локацию'}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 2,
                    minHeight: 52,
                    px: 2,
                    borderTop: '1px solid rgba(15, 23, 42, 0.08)',
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Позиций на странице
                  </Typography>
                  <Select
                    size="small"
                    value={rowsPerPage}
                    onChange={(event) => {
                      const nextRowsPerPage = Number(event.target.value);
                      setRowsPerPage(nextRowsPerPage);
                      localStorage.setItem(INVENTORY_GRID_PAGE_SIZE_KEY, String(nextRowsPerPage));
                      setInventoryPage(0);
                    }}
                    sx={{ minWidth: 88 }}
                  >
                    {gridPageSizeOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="body2">
                    {filteredParts.length === 0
                      ? '0-0 из 0'
                      : `${safeInventoryPage * rowsPerPage + 1}-${Math.min(
                          (safeInventoryPage + 1) * rowsPerPage,
                          filteredParts.length
                        )} из ${filteredParts.length}`}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    disabled={safeInventoryPage === 0}
                    onClick={() => setInventoryPage((page) => Math.max(0, page - 1))}
                    sx={{ minWidth: 36 }}
                  >
                    {'<'}
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    disabled={safeInventoryPage >= totalInventoryPages - 1}
                    onClick={() => setInventoryPage((page) => Math.min(totalInventoryPages - 1, page + 1))}
                    sx={{ minWidth: 36 }}
                  >
                    {'>'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Последние движения склада
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
                  gap: 1.5,
                }}
              >
                {movements.slice(0, 9).map((movement) => (
                  <Box
                    key={movement.id}
                    sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="subtitle2">{movement.partName}</Typography>
                      <Chip
                        size="small"
                        color={movement.direction === 'out' ? 'error' : 'success'}
                        label={`${movement.direction === 'out' ? '-' : '+'}${movement.quantity}`}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {movement.reason}
                    </Typography>
                    {movement.orderNumber && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Заказ: {movement.orderNumber}
                      </Typography>
                    )}
                    {typeof movement.totalCost === 'number' && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Сумма: {movement.totalCost.toLocaleString('ru-RU')} ₽
                      </Typography>
                    )}
                    {movement.documentNumber && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Документ: {movement.documentNumber}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {movement.createdAt.toLocaleString('ru-RU')}
                    </Typography>
                  </Box>
                ))}
                {movements.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Движений по складу пока нет.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <InventoryPartFormDialog
        open={isPartDialogOpen}
        editingPartId={editingPartId}
        initialValues={partFormInitial}
        inventoryLocations={inventoryLocations}
        activeLocationFilter={activeLocationFilter}
        defaultLocation={defaultLocation}
        rootCategories={rootCategories}
        taxonomyNodes={taxonomyNodes}
        supplierOptions={supplierOptions}
        onClose={() => setIsPartDialogOpen(false)}
        onSave={handleSavePart}
      />

      <Dialog open={isCategoryDialogOpen} onClose={() => setIsCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Управление категориями</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Название категории" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Родительская категория</InputLabel>
                <Select value={newCategoryParentId} label="Родительская категория" onChange={(e) => setNewCategoryParentId(e.target.value)}>
                  <MenuItem value="">Корневая категория</MenuItem>
                  {rootCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleCreateCategory}>Добавить категорию</Button>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {rootCategories.map((category) => (
                  <Box key={category.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={editingCategoryId === category.id ? editingCategoryName : category.name}
                        onChange={(e) => {
                          setEditingCategoryId(category.id);
                          setEditingCategoryName(e.target.value);
                        }}
                      />
                      <IconButton size="small" onClick={handleSaveCategoryEdit}><CheckCircle fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteCategory(category.id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCategoryDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Информация о запчасти</DialogTitle>
        <DialogContent>
          {selectedPart && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>{selectedPart.name}</Typography>
                <Typography variant="body2" color="text.secondary">Артикул: {selectedPart.partNumber}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Категория</Typography>
                <Chip label={selectedPart.subcategory ? `${selectedPart.category} / ${selectedPart.subcategory}` : selectedPart.category} color="primary" size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Модель</Typography>
                <Typography variant="body1">{getPartDisplayModel(selectedPart) || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Локация</Typography>
                <Typography variant="body1" fontWeight={700}>{getLocationLabel(selectedPart.warehouseId)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Остаток / порог уведомления</Typography>
                <Typography variant="body1" fontWeight={700}>{selectedPart.quantity} / {getAlertThreshold(selectedPart)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Оптовая цена</Typography>
                <Typography variant="body1" fontWeight={700}>{formatPrice(Number(selectedPart.wholesalePrice) || 0)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Розничная цена</Typography>
                <Typography variant="body1" fontWeight={700}>{formatPrice(getRetailPrice(selectedPart))}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Порог уведомления</Typography>
                <Typography variant="body1" fontWeight={700}>{getAlertThreshold(selectedPart)} {selectedPart.notificationsEnabled === false ? '(отключено)' : ''}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(15,23,42,0.02)' }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Настройка уведомления</Typography>
                  <Typography variant="body2" color="text.secondary">Эта запчасть {selectedPart.notificationsEnabled === false ? 'не участвует' : 'участвует'} в общем уведомлении о низком остатке. Порог срабатывания: {getAlertThreshold(selectedPart)} шт.</Typography>
                  <Button sx={{ mt: 1.5 }} variant="outlined" startIcon={<Edit />} onClick={() => openEditPartDialog(selectedPart)}>Настроить запчасть</Button>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Последние движения</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {movements.filter((movement) => movement.partId === selectedPart.id).slice(0, 5).map((movement) => (
                    <Box key={movement.id} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2">{movement.reason}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{movement.direction === 'out' ? 'Расход' : 'Приход'} • {movement.quantity} шт. • {movement.createdAt.toLocaleString('ru-RU')}</Typography>
                      {typeof movement.totalCost === 'number' && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Сумма: {movement.totalCost.toLocaleString('ru-RU')} ₽
                        </Typography>
                      )}
                      {movement.documentNumber && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Документ: {movement.documentNumber}
                        </Typography>
                      )}
                    </Box>
                  ))}
                  {movements.filter((movement) => movement.partId === selectedPart.id).length === 0 && (
                    <Typography variant="body2" color="text.secondary">Движений по этой позиции пока нет.</Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            justifyContent: 'flex-end',
            '& > :not(style) ~ :not(style)': { ml: 0 },
            '& .MuiButton-root': {
              minHeight: 40,
              minWidth: { xs: '100%', sm: 132 },
              whiteSpace: 'nowrap',
            },
          }}
        >
          {selectedPart && (
            <>
              <Button variant="outlined" startIcon={<Add />} onClick={() => openReceiptDialog(selectedPart)}>
                Оприходовать
              </Button>
              <Button variant="outlined" startIcon={<LocalShipping />} onClick={() => openWriteoffDialog(selectedPart, 'manual')}>
                Списать
              </Button>
              <Button variant="outlined" startIcon={<ReceiptLong />} onClick={() => openWriteoffDialog(selectedPart, 'order')}>
                Списать в заказ
              </Button>
              <Button variant="outlined" startIcon={<ReceiptLong />} onClick={() => openSellDialog(selectedPart)}>
                Продать
              </Button>
              <Button variant="outlined" startIcon={<Edit />} onClick={() => openEditPartDialog(selectedPart)}>
                Редактировать
              </Button>
            </>
          )}
          <Button onClick={() => setIsViewDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <InventoryReceiptDialog
        open={isReceiptDialogOpen}
        part={selectedPart}
        onClose={() => setIsReceiptDialogOpen(false)}
        onSubmit={handleReceiveStock}
      />

      <InventoryWriteoffDialog
        open={isWriteoffDialogOpen}
        part={selectedPart}
        initialMode={writeoffInitialMode}
        activeOrders={activeOrders}
        onClose={() => setIsWriteoffDialogOpen(false)}
        onRequestOrders={loadOrdersForWriteoff}
        onSubmit={handleWriteoffStock}
      />

      <InventorySellDialog
        open={isSellDialogOpen}
        part={selectedPart}
        defaultPrice={sellDefaultPrice}
        onClose={() => setIsSellDialogOpen(false)}
        onSubmit={handleSellItem}
      />

      <DataExchangeDialog
        open={dataExchangeOpen}
        onClose={() => setDataExchangeOpen(false)}
        title="Импорт и экспорт товаров"
        entityLabel="товаров"
        fileBaseName="sklad"
        sheetName="Склад"
        columns={INVENTORY_EXCHANGE_COLUMNS}
        exportRows={inventoryExchangeExportRows}
        templateSamples={inventoryTemplateSamples()}
        onImport={(rows, options) => importInventoryRows(rows, options)}
        onImported={async () => {
          await refreshInventory();
        }}
      />

    </Box>
  );
};

export default InventoryPage;
